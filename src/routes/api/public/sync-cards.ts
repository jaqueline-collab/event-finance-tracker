import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

function segredoValido(request: Request) {
  const esperado = process.env["SYNC_CRON_SECRET"];
  const recebido = request.headers.get("x-sync-secret");
  if (!esperado || !recebido) return false;
  const a = createHmac("sha256", "elora-sync").update(recebido).digest();
  const b = createHmac("sha256", "elora-sync").update(esperado).digest();
  return timingSafeEqual(a, b);
}

/**
 * POST /api/public/sync-cards — chamada agendada a cada 30 min.
 * Lê só cards alterados (UpdatedAt.After = última leitura − 1 h) de todos
 * os clientes com espelho e conexão ativa. Devolve só contagens.
 */
export const Route = createFileRoute("/api/public/sync-cards")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!segredoValido(request)) return new Response("não autorizado", { status: 401 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sincronizarCards, contextoElora } = await import("@/lib/elora-cards.server");
        const { usaEspelho } = await import("@/lib/elora-espelho.server");
        const { data: contas } = await (supabaseAdmin as any).from("elora_integracao_contas").select("cliente_id").eq("ativo", true);
        const resultado: Record<string, unknown> = {};
        for (const { cliente_id } of contas ?? []) {
          try {
            if (!(await usaEspelho(supabaseAdmin as any, cliente_id))) continue;
            const ctx = await contextoElora(supabaseAdmin as any, cliente_id);
            if (!ctx) continue;
            const r = await sincronizarCards(supabaseAdmin as any, cliente_id, ctx, 20_000);
            resultado[cliente_id] = { concluido: r.concluido, registros: r.registros, leituras: r.leituras };
          } catch {
            resultado[cliente_id] = { erro: true };
          }
        }
        return Response.json({ ok: true, resultado });
      },
    },
  },
});
