import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { validarProposta } from "@/lib/assistente-config";

async function exigirSuperAdmin(db: any) {
  const { data } = await db.rpc("is_admin");
  if (!data) throw new Error("acesso-negado: só a super admin.");
}

/** Aplica uma proposta do assistente. Revalida super admin, esquema e cliente; registra a ação. */
export const aplicarProposta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1).max(100), proposta: z.unknown() }).parse(i))
  .handler(async ({ data, context }) => {
    await exigirSuperAdmin(context.supabase);
    const p = validarProposta(data.proposta, data.clienteId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { aplicarPropostaServidor } = await import("@/lib/assistente-config.server");
    const c = context as any;
    return aplicarPropostaServidor(supabaseAdmin as any, p, { usuarioId: c.userId ?? null, email: c.claims?.email ?? null });
  });

export const desfazerAcaoConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1).max(100), acaoId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await exigirSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { desfazerAcaoServidor } = await import("@/lib/assistente-config.server");
    return desfazerAcaoServidor(supabaseAdmin as any, data.clienteId, data.acaoId);
  });

export const listarAcoesConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1).max(100) }).parse(i))
  .handler(async ({ data, context }) => {
    await exigirSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: l, error } = await (supabaseAdmin as any).from("elora_config_acoes").select("id, usuario_email, alvo, descricao, desfeita_em, created_at").eq("cliente_id", data.clienteId).order("created_at", { ascending: false }).limit(30);
    if (error) throw new Error(error.message);
    return { acoes: (l ?? []).map((a: any) => ({ id: String(a.id), quem: a.usuario_email ?? "", alvo: String(a.alvo), descricao: String(a.descricao ?? ""), desfeita: Boolean(a.desfeita_em), em: String(a.created_at) })) };
  });
