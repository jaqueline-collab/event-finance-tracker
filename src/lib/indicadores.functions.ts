import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function exigirSuperAdmin(db: any) {
  const { data } = await db.rpc("is_admin");
  if (!data) throw new Error("acesso-negado: só a super admin.");
}

const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * Tela de validação (só super admin): relatório calculado pelo motor e,
 * por dia, o que já existe gravado (n8n) nas colunas padrão. Não grava nada.
 */
export const validarRelatorioDiario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1), de: dia, ate: dia }).parse(i))
  .handler(async ({ data, context }) => {
    await exigirSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { calcularRelatorioCliente, lerRelatorioExistente } = await import("@/lib/indicadores.server");
    const p = { de: data.de, ate: data.ate };
    const [r, existente] = await Promise.all([
      calcularRelatorioCliente(supabaseAdmin as any, data.clienteId, p),
      lerRelatorioExistente(supabaseAdmin as any, data.clienteId, p),
    ]);
    return { ...r, existente: Object.fromEntries(existente) };
  });

/** Sincronização só de cards (botão e testes); retoma pelo cursor. */
export const sincronizarCardsCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1) }).parse(i))
  .handler(async ({ data, context }) => {
    await exigirSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sincronizarCards, contextoElora } = await import("@/lib/elora-cards.server");
    const ctx = await contextoElora(supabaseAdmin as any, data.clienteId);
    if (!ctx) throw new Error("integracao: cliente sem conexão com o Elora.");
    return sincronizarCards(supabaseAdmin as any, data.clienteId, ctx, 25_000);
  });

const pessoa = z.object({ nome: z.string().trim().max(200).optional().nullable(), email: z.string().trim().email().max(320).optional().nullable() })
  .refine((p) => !!(p.nome || p.email), "informe nome ou e-mail");

/** Lista global de suporte interno (vale para todos os clientes). Só super admin. */
export const lerSuporteInterno = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await exigirSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any).from("elora_suporte_interno").select("id, nome, email").order("criado_em");
    if (error) throw new Error(error.message);
    return data as { id: string; nome: string | null; email: string | null }[];
  });

export const salvarSuporteInterno = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ acao: z.enum(["adicionar", "remover"]), id: z.string().uuid().optional(), pessoa: pessoa.optional() }).parse(i))
  .handler(async ({ data, context }) => {
    await exigirSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const t = (supabaseAdmin as any).from("elora_suporte_interno");
    const { error } =
      data.acao === "adicionar"
        ? await t.insert({ nome: data.pessoa?.nome || null, email: data.pessoa?.email || null })
        : await t.delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Configuração do relatório por cliente: equipe de cada canal + atendentes ignorados extra. Só super admin. */
export const salvarCorteCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ clienteId: z.string().min(1), equipePorCanal: z.record(z.string().max(100), z.string().trim().max(100)), atendentesIgnorados: z.array(pessoa).max(50) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await exigirSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("elora_relatorio_corte_config")
      .upsert({ cliente_id: data.clienteId, equipe_por_canal: data.equipePorCanal, atendentes_ignorados: data.atendentesIgnorados, atualizado_em: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Regras do relatório de um cliente (tela Configurar). Só super admin. */
export const lerRegrasRelatorio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1) }).parse(i))
  .handler(async ({ data, context }) => {
    await exigirSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const [corte, conta, canais] = await Promise.all([
      db.from("elora_relatorio_corte_config").select("equipe_por_canal, atendentes_ignorados").eq("cliente_id", data.clienteId).maybeSingle(),
      db.from("elora_integracao_contas").select("fonte_dados").eq("cliente_id", data.clienteId).maybeSingle(),
      db.from("elora_apoio_espelho").select("externo_id, nome, payload").eq("cliente_id", data.clienteId).eq("tipo", "canal").order("nome"),
    ]);
    for (const r of [corte, conta, canais]) if (r.error) throw new Error(r.error.message);
    return {
      equipePorCanal: (corte.data?.equipe_por_canal ?? {}) as Record<string, string>,
      atendentesIgnorados: (Array.isArray(corte.data?.atendentes_ignorados) ? corte.data.atendentes_ignorados : []) as { nome?: string | null; email?: string | null }[],
      fonteDados: (conta.data?.fonte_dados === "antiga" ? "antiga" : "automatica") as "antiga" | "automatica",
      temConta: Boolean(conta.data),
      canais: (canais.data ?? []).map((c: any) => ({ id: String(c.externo_id), nome: String(c.payload?.identity?.humanId ?? c.nome ?? c.externo_id) })),
    };
  });

export const salvarFonteDados = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1), fonte: z.enum(["antiga", "automatica"]) }).parse(i))
  .handler(async ({ data, context }) => {
    await exigirSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("elora_integracao_contas").update({ fonte_dados: data.fonte }).eq("cliente_id", data.clienteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
