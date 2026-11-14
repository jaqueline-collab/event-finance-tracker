import { exibirCanal } from "./nome-canal";
import { NAO_DEFINIDO } from "@/lib/nao-definido";
import type { FiltroCampo } from "@/lib/campos-elora";
import type { Filtros, Periodo } from "./painel-visual";
import { estadoCobertura } from "./sync-cobertura";
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

import { lerTudo } from "./ler-paginas.server";

/** Cache curto por cliente (contatos e atendimentos mudam só na sincronização). */
const cache = new Map<string, { em: number; chave: string; contatos: ContatoP[]; atendimentos: AtendimentoP[] }>();


export async function calcularPainelVisual(adm: any, clienteId: string, p: Periodo, filtros: Filtros = {}, campos: FiltroCampo[] = [], ctx?: import("./calculo-contexto.server").Ctx) {
    const { data: estado } = await adm
      .from("elora_sync_estado")
      .select("fonte, concluido_em, atualizado_em")
      .eq("cliente_id", clienteId);
    const ultimaSync =
      (estado ?? [])
        .map((r: any) => r.concluido_em ?? r.atualizado_em)
        .filter(Boolean)
        .sort()
        .pop() ?? null;

    const id = clienteId;
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
      const mapaCanais = await (await import("./nome-canal.server")).lerMapaCanais(adm, id);
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
          canal: exibirCanal(mapaCanais, a.canal_id, a.canal_nome || nomes.get(`canal:${a.canal_id}`)) || NAO_DEFINIDO,
          atendente: a.atendente_nome || (a.atendente_id ? nomes.get(`usuario:${a.atendente_id}`) : null) || SEM_ATENDENTE,
          criado_em: a.criado_em,
          tmr: a.time_wait_segundos,
          tma: a.time_service_segundos,
        })),
      };
      cache.set(id, base);
    }

    // Mensagens: só colunas sem texto, TO_HUB, do período anterior até o fim.
    const ant = periodoAnterior({ de: p.de, ate: p.ate });
    const ini = limitesUtc(ant).inicio;
    const fim = limitesUtc({ de: p.de, ate: p.ate }).fim;
    const { lerMensagensSemTexto } = await import("@/lib/elora-espelho.server");
    const mensagens: MensagemP[] = await lerMensagensSemTexto(adm, id, ini, fim, ctx);

    let soContatos: Set<string> | null = null;
    if (campos.length) {
      const { lerBaseCampos } = await import("@/lib/campos-elora.server");
      const { aplicarFiltrosCampos } = await import("@/lib/campos-elora");
      soContatos = aplicarFiltrosCampos(ctx ? (await (await import("@/lib/campos-elora.server")).catalogoDoCliente(adm, id, ctx)).base : await lerBaseCampos(adm, id), campos as any)?.contatos ?? null;
    }
    const resumo = agregarPainel({ contatos: base.contatos, atendimentos: base.atendimentos, mensagens }, { de: p.de, ate: p.ate }, filtros, soContatos);
     const cobertura = estadoCobertura(p.ate, ["contatos", "atendimentos", "mensagens"], estado ?? []);
     return { disponivel: true as const, ultimaSync, cobertura, ...resumo };
}
