import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aplicarEdicao, ConfirmacaoNecessaria, exigirAdmin, salvarEdicaoSchema } from "./fechamento-edicao.aplicar";
export type { SalvarEdicaoInput } from "./fechamento-edicao.aplicar";


export const listarEdicoesFechamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ fechamentoId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const adm = supabaseAdmin as any;
    const { data: rows, error } = await adm
      .from("elora_fechamento_edicoes")
      .select("id, item_id, campo, valor_antigo, valor_novo, motivo, editado_por, editado_em")
      .eq("fechamento_id", data.fechamentoId)
      .order("editado_em", { ascending: false })
      .limit(2000);
    if (error) throw new Error(`historico: ${error.message}`);
    const quem = [...new Set(((rows ?? []) as any[]).map((r) => r.editado_por).filter(Boolean))];
    const nomes = new Map<string, string>();
    if (quem.length) {
      const { data: us } = await adm.from("app_users").select("user_id, nome, email").in("user_id", quem);
      for (const u of (us ?? []) as any[]) nomes.set(u.user_id, u.nome || u.email || "");
    }
    return ((rows ?? []) as any[]).map((r) => ({ ...r, editado_por_nome: nomes.get(r.editado_por) ?? null }));
  });

export const salvarEdicaoFechamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => salvarEdicaoSchema.parse(i))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    try {
      return { ok: true as const, ...(await aplicarEdicao(supabaseAdmin, context.userId, data)) };
    } catch (e) {
      if (e instanceof ConfirmacaoNecessaria) return { ok: false as const, confirmacao: e.message.split(":")[0], mensagem: e.message.slice(e.message.indexOf(":") + 1).trim() };
      throw e;
    }
  });
