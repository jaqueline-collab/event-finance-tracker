import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { respostaNaoAutorizada, segredoAutomacaoValido } from "@/lib/automation-auth";

const contador = z.number().int().min(0).max(1_000_000);

const corpoSchema = z
  .object({
    cliente_id: z.string().min(1).max(200),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    novos_contatos: contador,
    novos_contatos_ads: contador,
    conversas_usuario: contador,
    conversas_bot: contador,
    consulta_agendada: contador,
    consulta_agendada_ads: contador,
    procedimento_vendido: contador,
    procedimento_vendido_ads: contador,
  })
  .strict();

/**
 * POST /api/public/relatorio-diario/registrar
 * Grava o relatório diário de um cliente (upsert por cliente + data).
 * Só aceita clientes com relatorio_diario_ativo = true; exige o segredo.
 */
export const Route = createFileRoute("/api/public/relatorio-diario/registrar")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!segredoAutomacaoValido(request)) return respostaNaoAutorizada();

        let corpo: unknown;
        try {
          corpo = await request.json();
        } catch {
          return Response.json({ erro: "corpo inválido" }, { status: 400 });
        }
        const parsed = corpoSchema.safeParse(corpo);
        if (!parsed.success) {
          return Response.json({ erro: "campos inválidos" }, { status: 400 });
        }
        const d = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: conta } = await supabaseAdmin
          .from("elora_integracao_contas")
          .select("cliente_id")
          .eq("cliente_id", d.cliente_id)
          .eq("relatorio_diario_ativo", true)
          .maybeSingle();
        if (!conta) {
          return Response.json(
            { erro: "cliente não encontrado ou relatório diário desligado" },
            { status: 404 },
          );
        }

        const { error } = await supabaseAdmin.from("elora_relatorio_diario").upsert(
          {
            cliente_id: d.cliente_id,
            data: d.data,
            novos_contatos: d.novos_contatos,
            novos_contatos_ads: d.novos_contatos_ads,
            conversas_usuario: d.conversas_usuario,
            conversas_bot: d.conversas_bot,
            consulta_agendada: d.consulta_agendada,
            consulta_agendada_ads: d.consulta_agendada_ads,
            procedimento_vendido: d.procedimento_vendido,
            procedimento_vendido_ads: d.procedimento_vendido_ads,
            atualizado_em: new Date().toISOString(),
          },
          { onConflict: "cliente_id,data" },
        );
        if (error) return Response.json({ erro: error.message }, { status: 500 });

        return Response.json({ ok: true });
      },
    },
  },
});
