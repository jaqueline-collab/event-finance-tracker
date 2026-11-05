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
