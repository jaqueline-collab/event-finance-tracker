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
  name: "list_fechamentos",
  title: "Listar fechamentos mensais",
  description:
    "Lista os fechamentos mensais do usuário autenticado, com competência, título, status e totais (bruto, desconto, líquido).",
  inputSchema: {
    competencia: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .optional()
      .describe("Filtra por competência no formato AAAA-MM (opcional)."),
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ competencia, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("elora_fechamentos")
      .select("id, competencia, titulo, status, total_bruto, total_desconto, total_liquido, criado_em")
      .order("competencia", { ascending: false })
      .limit(limit ?? 50);
    if (competencia) q = q.eq("competencia", competencia);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { fechamentos: data },
    };
  },
});