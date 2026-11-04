// Será aposentada quando o relatório diário passar a rodar dentro do app.
import { createFileRoute } from "@tanstack/react-router";
import { respostaNaoAutorizada, segredoAutomacaoValido } from "@/lib/automation-auth";

/**
 * GET /api/public/relatorio-diario/listar-clientes
 * Para a automação externa (n8n): devolve, para cada cliente com
 * relatorio_diario_ativo = true, { cliente_id, base_url, api_key }.
 * Única rota que expõe o token — somente mediante o segredo compartilhado.
 * A chave vem do cofre (com fallback para a coluna antiga).
 */
export const Route = createFileRoute("/api/public/relatorio-diario/listar-clientes")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!segredoAutomacaoValido(request)) return respostaNaoAutorizada();

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { obterChaveElora, registrarUso } = await import("@/lib/credenciais.server");
        const { data, error } = await supabaseAdmin
          .from("elora_integracao_contas")
          .select("cliente_id, base_url")
          .eq("relatorio_diario_ativo", true);
        if (error) return Response.json({ erro: error.message }, { status: 500 });

        const clientes: { cliente_id: string; base_url: string; api_key: string }[] = [];
        for (const c of (data ?? []) as any[]) {
          const id = String(c.cliente_id);
          let chave: string | null = null;
          try {
            chave = await obterChaveElora(id);
          } catch {
            chave = null;
          }
          await registrarUso(id, "leitura_automacao", Boolean(chave), chave ? null : "sem chave");
          if (chave) clientes.push({ cliente_id: id, base_url: String(c.base_url), api_key: chave });
        }
        return Response.json({ clientes });
      },
    },
  },
});
