import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_clientes",
  title: "Listar clientes",
  description:
    "Lista os clientes do usuário autenticado no Elora, com plano, ciclo, status de churn e valores de acompanhamento.",
  inputSchema: {
    limit: z.number().int().min(1).max(500).optional().describe("Máximo de clientes a retornar (padrão 100)."),
    incluirChurn: z.boolean().optional().describe("Se true, inclui clientes que já sofreram churn."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, incluirChurn }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("elora_clientes")
      .select("id, nome, plano_id, data_inicio, data_vencimento, data_churn, valor_acompanhamento, observacao")
      .order("nome", { ascending: true })
      .limit(limit ?? 100);
    if (!incluirChurn) q = q.is("data_churn", null);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { clientes: data },
    };
  },
});