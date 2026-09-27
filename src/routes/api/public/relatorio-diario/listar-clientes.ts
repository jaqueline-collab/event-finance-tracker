import { createFileRoute } from "@tanstack/react-router";
import { respostaNaoAutorizada, segredoAutomacaoValido } from "@/lib/automation-auth";

/**
 * GET /api/public/relatorio-diario/listar-clientes
 * Para a automação externa (n8n): devolve, para cada cliente com
 * relatorio_diario_ativo = true, { cliente_id, base_url, api_key }.
 * Única rota que expõe o token — somente mediante o segredo compartilhado.
 */
export const Route = createFileRoute("/api/public/relatorio-diario/listar-clientes")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!segredoAutomacaoValido(request)) return respostaNaoAutorizada();

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("elora_integracao_contas")
          .select("cliente_id, base_url, api_key")
          .eq("relatorio_diario_ativo", true);
        if (error) return Response.json({ erro: error.message }, { status: 500 });

        return Response.json({
          clientes: (data ?? []).map((c: any) => ({
            cliente_id: String(c.cliente_id),
            base_url: String(c.base_url),
            api_key: String(c.api_key),
          })),
        });
      },
    },
  },
});
