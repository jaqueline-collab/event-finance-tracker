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
 * POST /api/public/sync-cards — agendamento elora-sync-3h.
 * Roda TODAS as fontes (apoio, contatos, atendimentos, mensagens, cards) de
 * cada cliente com espelho, com trava por cliente; o erro real de cada fonte
 * fica gravado em elora_sync_estado. Devolve só contagens e mensagens curtas.
 */
export const Route = createFileRoute("/api/public/sync-cards")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!segredoValido(request)) return new Response("não autorizado", { status: 401 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { contextoElora } = await import("@/lib/elora-cards.server");
        const { usaEspelho } = await import("@/lib/elora-espelho.server");
        const { pegarTrava, soltarTrava, rodarTodas, mensagemCurta } = await import("@/lib/sync-orquestrador.server");
        const db = supabaseAdmin as any;
        const { data: contas } = await db.from("elora_integracao_contas").select("cliente_id").eq("ativo", true);
        // Quem está há mais tempo sem atualizar vai primeiro, para ninguém ficar sempre no fim da fila.
        const { data: est } = await db.from("elora_sync_estado").select("cliente_id, atualizado_em");
        const ultima = (id: string) => (est ?? []).filter((e: any) => e.cliente_id === id).map((e: any) => e.atualizado_em ?? "").sort()[0] ?? "";
        const ids = (contas ?? []).map((c: any) => c.cliente_id as string).sort((a: string, b: string) => ultima(a).localeCompare(ultima(b)));
        const inicio = Date.now();
        const ORCAMENTO = 105_000;
        const resultado: Record<string, unknown> = {};
        for (const cliente_id of ids) {
          const resta = ORCAMENTO - (Date.now() - inicio);
          if (resta < 10_000) { resultado[cliente_id] = { adiado: true }; continue; }
          const dono = `cron-${crypto.randomUUID()}`;
          try {
            if (!(await usaEspelho(db, cliente_id))) continue;
            const ctx = await contextoElora(db, cliente_id);
            if (!ctx) { resultado[cliente_id] = { erro: "cliente sem conexão com o Elora" }; continue; }
            if (!(await pegarTrava(db, cliente_id, dono))) { resultado[cliente_id] = { emAndamento: true }; continue; }
            try {
              const rodada = await rodarTodas(db, cliente_id, ctx, Math.min(resta, 60_000));
              resultado[cliente_id] = rodada;
              // Checagem semanal de mensagens (só confere e registra), quando a rodada terminou e ainda há tempo.
              const { checagemVencida, checarMensagensSemana } = await import("@/lib/mensagens-checagem.server");
              if (ORCAMENTO - (Date.now() - inicio) > 25_000 && (await checagemVencida(db, cliente_id))) {
                const ch = await checarMensagensSemana(db, cliente_id, ctx, 20_000).catch(() => []);
                (resultado as any)[`${cliente_id}:checagem`] = ch.map((l: any) => ({ dia: l.dia, diferenca: l.diferenca }));
              }
            } finally {
              await soltarTrava(db, cliente_id, dono);
            }
          } catch (e) {
            resultado[cliente_id] = { erro: mensagemCurta(e) };
          }
        }
        return Response.json({ ok: true, resultado });
      },
    },
  },
});
