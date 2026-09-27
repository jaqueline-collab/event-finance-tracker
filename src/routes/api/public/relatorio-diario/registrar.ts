import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { respostaNaoAutorizada, segredoAutomacaoValido } from "@/lib/automation-auth";

const contador = z.number().int().min(0).max(1_000_000);

const corpoBaseSchema = z
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
    // Opcionais para compatibilidade com chamadas antigas da automação que
    // ainda não enviam canal/atendente. '' é o valor "não informado" — o
    // mesmo sentinela usado na constraint única da tabela (ver migração
    // 0022), então null/omitido caem em '' antes do upsert.
    canal: z.string().max(200).nullable().optional(),
    atendente: z.string().max(200).nullable().optional(),
    equipe: z.string().max(200).nullable().optional(),
  })
  .strict();

// Aceita um único registro ou uma lista (uma linha por canal/atendente do
// cliente no dia) num só POST, para não precisar de um HTTP request por
// linha no n8n.
const corpoSchema = z.union([corpoBaseSchema, z.array(corpoBaseSchema).min(1).max(500)]);

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
        const linhas = Array.isArray(parsed.data) ? parsed.data : [parsed.data];

        const clienteId = linhas[0].cliente_id;
        if (linhas.some((l) => l.cliente_id !== clienteId)) {
          return Response.json({ erro: "todas as linhas do lote devem ser do mesmo cliente" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: conta } = await supabaseAdmin
          .from("elora_integracao_contas")
          .select("cliente_id")
          .eq("cliente_id", clienteId)
          .eq("relatorio_diario_ativo", true)
          .maybeSingle();
        if (!conta) {
          return Response.json(
            { erro: "cliente não encontrado ou relatório diário desligado" },
            { status: 404 },
          );
        }

        const agora = new Date().toISOString();
        const { error } = await supabaseAdmin.from("elora_relatorio_diario").upsert(
          linhas.map((d) => ({
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
            // '' é o sentinela de "não informado" (ver migração 0022) —
            // mantém o onConflict funcionando mesmo sem canal/atendente.
            canal: d.canal ?? "",
            atendente: d.atendente ?? "",
            equipe: d.equipe ?? "",
            atualizado_em: agora,
          })),
          { onConflict: "cliente_id,data,canal,atendente,equipe" },
        );
        if (error) return Response.json({ erro: error.message }, { status: 500 });

        return Response.json({ ok: true, registros: linhas.length });
      },
    },
  },
});
