import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { colunaStatusSchema, colunaStatusValida, type ColunaStatus } from "@/lib/status-lead";

async function exigirSuperAdmin(db: any) {
  const { data } = await db.rpc("is_admin");
  if (!data) throw new Error("acesso-negado: só a super admin.");
}

/** Origem da coluna "Status do lead" e funis do cliente (só super admin). */
export const lerConfigStatusLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1) }).parse(i))
  .handler(async ({ data, context }): Promise<{ config: ColunaStatus | null; funis: { id: string; titulo: string; etapas: string[] }[] }> => {
    await exigirSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const [{ data: cfg }, { data: paineis }] = await Promise.all([
      db.from("elora_relatorio_corte_config").select("coluna_status").eq("cliente_id", data.clienteId).maybeSingle(),
      db.from("elora_paineis_sincronizados").select("painel_id, titulo, etapas").eq("cliente_id", data.clienteId).order("titulo"),
    ]);
    return {
      config: colunaStatusValida(cfg?.coluna_status),
      funis: (paineis ?? []).map((p: any) => ({ id: String(p.painel_id), titulo: String(p.titulo ?? "Sem título"), etapas: (p.etapas ?? []).map((e: any) => String(e.nome)) })),
    };
  });

/** Grava (ou limpa) a origem da coluna. Muda a versão de configuração, então nenhum número antigo é servido. */
export const salvarConfigStatusLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1), config: colunaStatusSchema.nullable() }).parse(i))
  .handler(async ({ data, context }) => {
    await exigirSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("elora_relatorio_corte_config")
      .upsert({ cliente_id: data.clienteId, coluna_status: data.config, atualizado_em: new Date().toISOString() }, { onConflict: "cliente_id" });
    if (error) throw new Error(`status do lead: ${error.message}`);
    return { ok: true };
  });
