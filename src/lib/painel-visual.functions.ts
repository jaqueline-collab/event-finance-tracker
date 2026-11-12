import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { NAO_DEFINIDO } from "@/lib/nao-definido";
import { filtroCampoSchema } from "@/lib/campos-elora";
import {
  agregarPainel,
  limitesUtc,
  origemDoLead,
  periodoAnterior,
  SEM_ATENDENTE,
  type AtendimentoP,
  type ContatoP,
  type MensagemP,
} from "@/lib/painel-visual";

const vd = z.union([z.string().max(300), z.array(z.string().max(300)).max(100)]).optional();
const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const schema = z.object({
  clienteId: z.string().min(1),
  de: dia,
  ate: dia,
  filtros: z
    .object({ canal: vd, origem: vd, atendente: vd, etiqueta: vd, campanha: vd })
    .default({}),
  campos: z.array(filtroCampoSchema).max(20).default([]),
});

async function lerTudo(q: () => any): Promise<any[]> {
  const out: any[] = [];
  for (let i = 0; ; i += 1000) {
    const { data, error } = await q().range(i, i + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

/** Cache curto por cliente (contatos e atendimentos mudam só na sincronização). */
const cache = new Map<string, { em: number; chave: string; contatos: ContatoP[]; atendimentos: AtendimentoP[] }>();

/**
 * Painel visual do cliente: só agregados, lidos do espelho no servidor.
 * Nunca lê o texto das mensagens.
 */
export const getPainelVisual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => schema.parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const [{ data: interno }, { data: meuCliente }, { data: parceiroOk }] = await Promise.all([
      db.rpc("is_equipe_interna"),
      db.rpc("cliente_do_usuario"),
      db.rpc("parceiro_pode_ver_painel", { _cliente_id: data.clienteId }),
    ]);
    if (!(Boolean(interno) || meuCliente === data.clienteId || Boolean(parceiroOk)))
      throw new Error("acesso-negado: este painel não está liberado para você.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const adm = supabaseAdmin as any;
    const { usaEspelho } = await import("@/lib/elora-espelho.server");
    if (!(await usaEspelho(adm, data.clienteId))) return { disponivel: false as const };

    const { data: estado } = await adm
      .from("elora_sync_estado")
      .select("fonte, concluido_em, atualizado_em")
      .eq("cliente_id", data.clienteId);
    const ultimaSync =
      (estado ?? [])
        .map((r: any) => r.concluido_em ?? r.atualizado_em)
        .filter(Boolean)
        .sort()
        .pop() ?? null;

    const id = data.clienteId;
    let base = cache.get(id);
    if (!base || base.chave !== ultimaSync || Date.now() - base.em > 120_000) {
      const [ct, at, apoio] = await Promise.all([
        lerTudo(() =>
          adm
            .from("elora_contatos_espelho")
            .select("externo_id, criado_em, origem, utm_source, utm_campaign, etiquetas")
            .eq("cliente_id", id)
            .order("externo_id"),
        ),
        lerTudo(() =>
          adm
            .from("elora_atendimentos_espelho")
            .select("externo_id, contato_id, canal_id, canal_nome, atendente_id, atendente_nome, criado_em, time_wait_segundos, time_service_segundos")
            .eq("cliente_id", id)
            .order("externo_id"),
        ),
        lerTudo(() => adm.from("elora_apoio_espelho").select("tipo, externo_id, nome").eq("cliente_id", id).in("tipo", ["canal", "usuario"]).order("externo_id")),
      ]);
      const nomes = new Map(apoio.map((a: any) => [`${a.tipo}:${a.externo_id}`, a.nome as string | null]));
      base = {
        em: Date.now(),
        chave: ultimaSync,
        contatos: ct.map((c: any) => ({
          id: String(c.externo_id),
          criado_em: c.criado_em,
          origem: origemDoLead(c.utm_source, c.origem),
          etiquetas: Array.isArray(c.etiquetas) ? c.etiquetas.map(String) : [],
          campanha: c.utm_campaign || null,
          importado: String(c.origem ?? "").toUpperCase() === "IMPORTED",
        })),
        atendimentos: at.map((a: any) => ({
          id: String(a.externo_id),
          contato_id: a.contato_id ? String(a.contato_id) : null,
          canal: a.canal_nome || nomes.get(`canal:${a.canal_id}`) || NAO_DEFINIDO,
          atendente: a.atendente_nome || (a.atendente_id ? nomes.get(`usuario:${a.atendente_id}`) : null) || SEM_ATENDENTE,
          criado_em: a.criado_em,
          tmr: a.time_wait_segundos,
          tma: a.time_service_segundos,
        })),
      };
      cache.set(id, base);
    }

    // Mensagens: só colunas sem texto, TO_HUB, do período anterior até o fim.
    const ant = periodoAnterior({ de: data.de, ate: data.ate });
    const ini = limitesUtc(ant).inicio;
    const fim = limitesUtc({ de: data.de, ate: data.ate }).fim;
    const { lerMensagensSemTexto } = await import("@/lib/elora-espelho.server");
    const mensagens: MensagemP[] = await lerMensagensSemTexto(adm, id, ini, fim);

    let soContatos: Set<string> | null = null;
    if (data.campos.length) {
      const { lerBaseCampos } = await import("@/lib/campos-elora.server");
      const { aplicarFiltrosCampos } = await import("@/lib/campos-elora");
      soContatos = aplicarFiltrosCampos(await lerBaseCampos(adm, id), data.campos as any)?.contatos ?? null;
    }
    const resumo = agregarPainel({ contatos: base.contatos, atendimentos: base.atendimentos, mensagens }, { de: data.de, ate: data.ate }, data.filtros, soContatos);
    return { disponivel: true as const, ultimaSync, ...resumo };
  });
