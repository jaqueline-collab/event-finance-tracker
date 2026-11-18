import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { LinhaConferencia } from "@/lib/conferencia";

async function exigirSuperAdmin(db: any) {
  const { data: admin } = await db.rpc("is_admin");
  if (!admin) throw new Error("acesso-negado: apenas super admin.");
}
export type ConferenciaDto = { id: string; origem: string; iniciadoEm: string; concluidoEm: string | null; situacao: string; progresso: string | null; linhas: LinhaConferencia[] };
const dto = (c: any): ConferenciaDto | null =>
  c ? { id: String(c.id), origem: String(c.origem), iniciadoEm: String(c.iniciado_em), concluidoEm: c.concluido_em ?? null, situacao: String(c.situacao), progresso: c.progresso ?? null, linhas: c.linhas ?? [] } : null;

/** Última conferência (em andamento ou concluída) e a última concluída. Só super admin. */
export const lerConferencia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1) }).parse(i))
  .handler(async ({ data, context }) => {
    await exigirSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { ultimaConferencia, ultimaConcluida } = await import("@/lib/mensagens-checagem.server");
    const [u, c] = await Promise.all([ultimaConferencia(supabaseAdmin as any, data.clienteId), ultimaConcluida(supabaseAdmin as any, data.clienteId)]);
    return { atual: dto(u), concluida: dto(c) };
  });

/** Roda uma rodada da conferência (a tela chama de novo até concluir). Só lê o Elora. */
export const conferirAgora = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1) }).parse(i))
  .handler(async ({ data, context }) => {
    await exigirSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { contextoElora } = await import("@/lib/elora-cards.server");
    const ctx = await contextoElora(supabaseAdmin as any, data.clienteId);
    if (!ctx) throw new Error("Este cliente não tem conexão com o Elora App.");
    const { conferirCliente } = await import("@/lib/mensagens-checagem.server");
    return conferirCliente(supabaseAdmin as any, data.clienteId, ctx, 20_000, "manual");
  });
