import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LIMITES_CONFIG, MODELOS_ELORA_IA, normalizarConfig } from "./elora-ia";

async function exigirSuperAdmin(db: any) {
  const { data } = await db.rpc("is_admin");
  if (!data) throw new Error("acesso-negado: só a super admin.");
}

/** Configuração global da Elora + uso dos últimos 30 dias (só super admin). */
export const lerConfigEloraIaAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await exigirSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data } = await admin.from("elora_ia_config").select("*").eq("id", 1).maybeSingle();
    const desde = new Date(Date.now() - 30 * 86400_000).toISOString();
    const { data: uso } = await admin.from("elora_ia_conversas").select("area, tokens_entrada, tokens_saida, modelo").gte("criado_em", desde).limit(10000);
    const porArea: Record<string, number> = {};
    let entrada = 0;
    let saida = 0;
    for (const u of uso ?? []) {
      porArea[u.area] = (porArea[u.area] ?? 0) + 1;
      entrada += u.tokens_entrada ?? 0;
      saida += u.tokens_saida ?? 0;
    }
    return { config: normalizarConfig(data), uso30: { perguntas: (uso ?? []).length, porArea, entrada, saida } };
  });

const n = (k: keyof typeof LIMITES_CONFIG) => z.number().int().min(LIMITES_CONFIG[k][0]).max(LIMITES_CONFIG[k][1]);

export const salvarConfigEloraIa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        ligado: z.boolean(),
        modelo: z.enum(MODELOS_ELORA_IA),
        limite_diario: n("limite_diario"),
        max_pergunta: n("max_pergunta"),
        max_resposta_tokens: n("max_resposta_tokens"),
        retencao_dias: n("retencao_dias"),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await exigirSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("elora_ia_config")
      .update({ ...data, atualizado_em: new Date().toISOString(), atualizado_por: context.userId })
      .eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
