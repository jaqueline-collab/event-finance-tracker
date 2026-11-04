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
    z.object({ clienteId: z.string().min(1), fonte: z.enum(["apoio", "contatos", "atendimentos", "mensagens"]).default("apoio") }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: souAdmin } = await (context.supabase as any).rpc("is_admin");
    if (!souAdmin) throw new Error("acesso-negado: só a super admin pode sincronizar.");
    const { LEITURA_ANTIGA, ORDEM_FONTES, sincronizarFonte } = await import("@/lib/elora-espelho.server");
    if (LEITURA_ANTIGA.has(data.clienteId)) return { leituraAntiga: true as const, fonte: data.fonte, concluido: true, registros: 0, proxima: null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
    const r = await sincronizarFonte(supabaseAdmin as any, data.clienteId, data.fonte, ctx, 25_000);
    const i = ORDEM_FONTES.indexOf(data.fonte);
    const proxima = r.concluido ? (ORDEM_FONTES[i + 1] ?? null) : data.fonte;
    return { leituraAntiga: false as const, fonte: data.fonte, concluido: r.concluido, registros: r.registros, proxima };
  });
