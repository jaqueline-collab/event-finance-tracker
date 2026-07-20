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
  name: "get_cliente_detalhado",
  title: "Detalhar cliente",
  description:
    "Retorna o cadastro completo de um cliente do Elora junto com todos os seus movimentos (setup, upgrades, downgrades, churn).",
  inputSchema: {
    clienteId: z.string().describe("ID do cliente no Elora."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ clienteId }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const [{ data: cliente, error: e1 }, { data: movimentos, error: e2 }] = await Promise.all([
      supabase.from("elora_clientes").select("*").eq("id", clienteId).maybeSingle(),
      supabase
        .from("elora_movimentos")
        .select("*")
        .eq("cliente_id", clienteId)
        .order("data", { ascending: true }),
    ]);
    if (e1) return { content: [{ type: "text", text: e1.message }], isError: true };
    if (e2) return { content: [{ type: "text", text: e2.message }], isError: true };
    if (!cliente) {
      return { content: [{ type: "text", text: "Cliente não encontrado." }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify({ cliente, movimentos }, null, 2) }],
      structuredContent: { cliente, movimentos },
    };
  },
});