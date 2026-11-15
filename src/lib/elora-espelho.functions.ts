import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Roda um trecho curto da carga do espelho (só super admin). Cada chamada
 * continua do ponto salvo; repita até `concluido` ser verdadeiro em todas.
 * Nunca devolve conteúdo de contato, atendimento ou mensagem.
 */
export const sincronizarEspelhoCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ clienteId: z.string().min(1), fonte: z.enum(["apoio", "contatos", "atendimentos", "mensagens"]) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: souAdmin } = await (context.supabase as any).rpc("is_admin");
    if (!souAdmin) throw new Error("acesso-negado: só a super admin pode sincronizar.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { obterChaveElora } = await import("@/lib/credenciais.server");
    const { sincronizarFonte } = await import("@/lib/elora-espelho.server");
    const chave = await obterChaveElora(data.clienteId);
    const { data: conta } = await (supabaseAdmin as any)
      .from("elora_integracao_contas")
      .select("base_url")
      .eq("cliente_id", data.clienteId)
      .maybeSingle();
    if (!chave || !conta?.base_url) throw new Error("integracao: cliente sem conexão com o Elora.");
    const base = String(conta.base_url).replace(/\/+$/, "").replace(/\/(core|crm|chat)$/i, "");
    const ctx = { base, chave, chamadas: 0, retentativas: 0, erros: [] as string[] };
    const r = await sincronizarFonte(supabaseAdmin as any, data.clienteId, data.fonte, ctx, 25_000);
    return { ...r, chamadas: ctx.chamadas, retentativas: ctx.retentativas };
  });

/**
 * Botão "Sincronizar agora": roda um trecho (~25 s) da fonte pedida e diz
 * qual é a próxima. O navegador repete até `proxima` ser null. Clientes em
 * leitura antiga devolvem `leituraAntiga: true` (usam a sincronização antiga).
 * Só contagens voltam ao navegador; nunca conteúdo.
 */
export const sincronizarAgoraCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ clienteId: z.string().min(1), fonte: z.enum(["apoio", "contatos", "atendimentos", "mensagens", "cards"]).default("apoio") }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: souAdmin } = await (context.supabase as any).rpc("is_admin");
    if (!souAdmin) throw new Error("acesso-negado: só a super admin pode sincronizar.");
    const { lerFonteDados, ORDEM_FONTES, sincronizarFonte } = await import("@/lib/elora-espelho.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if ((await lerFonteDados(supabaseAdmin as any, data.clienteId)) === "antiga")
      return { leituraAntiga: true as const, fonte: data.fonte, concluido: true, registros: 0, proxima: null };
    const { obterChaveElora } = await import("@/lib/credenciais.server");
    const chave = await obterChaveElora(data.clienteId);
    const { data: conta } = await (supabaseAdmin as any)
      .from("elora_integracao_contas")
      .select("base_url")
      .eq("cliente_id", data.clienteId)
      .maybeSingle();
    if (!chave || !conta?.base_url) throw new Error("integracao: cliente sem conexão com o Elora.");
    const base = String(conta.base_url).replace(/\/+$/, "").replace(/\/(core|crm|chat)$/i, "");
    const ctx = { base, chave, chamadas: 0, retentativas: 0, erros: [] as string[] };
    // Depois das fontes do espelho, os cards (histórico de etapas).
    const { FONTES_SYNC, pegarTrava, soltarTrava, rodarFonte } = await import("@/lib/sync-orquestrador.server");
    const ordem = FONTES_SYNC;
    const dono = `manual-${crypto.randomUUID()}`;
    if (!(await pegarTrava(supabaseAdmin as any, data.clienteId, dono)))
      throw new Error("sincronizacao: Sincronização já em andamento para este cliente. Tente de novo em alguns minutos.");
    let r;
    try {
      r = await rodarFonte(supabaseAdmin as any, data.clienteId, data.fonte, ctx, 25_000);
    } finally {
      await soltarTrava(supabaseAdmin as any, data.clienteId, dono);
    }
    void ORDEM_FONTES; void sincronizarFonte;
    const i = ordem.indexOf(data.fonte);
    // Erro numa fonte não para as próximas: segue para a seguinte e o erro fica gravado.
    const proxima = r.concluido || r.erro ? (ordem[i + 1] ?? null) : data.fonte;
    return { leituraAntiga: false as const, fonte: data.fonte, concluido: r.concluido, registros: r.registros, proxima, erro: r.erro ?? null };
  });
