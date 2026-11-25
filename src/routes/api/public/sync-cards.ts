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
        const { data: abertas } = await db.from("elora_conferencias").select("cliente_id").eq("situacao", "conferindo").eq("origem", "automatica");
        const comConferenciaAberta = new Set((abertas ?? []).map((c: any) => String(c.cliente_id)));
        const ultima = (id: string) => (est ?? []).filter((e: any) => e.cliente_id === id).map((e: any) => e.atualizado_em ?? "").sort()[0] ?? "";
        // Quem já tem conferência automática aberta vem primeiro até concluir: trocar
        // a ordem das contas não pode deixar uma conferência três rodadas sem vez.
        const ids = (contas ?? []).map((c: any) => c.cliente_id as string).sort((a: string, b: string) => Number(comConferenciaAberta.has(b)) - Number(comConferenciaAberta.has(a)) || ultima(a).localeCompare(ultima(b)));
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
              // Conferência diária com o Elora App (só lê e registra), na primeira rodada depois das 02:55.
              const { conferirCliente, ultimaConferencia } = await import("@/lib/mensagens-checagem.server");
              const { conferenciaVencida } = await import("@/lib/conferencia");
              const ult = await ultimaConferencia(db, cliente_id);
              const continuar = ult?.situacao === "conferindo" && ult?.origem === "automatica";
              const conferir = continuar || conferenciaVencida(ult?.iniciado_em ?? null);
              // A conferência tem vez própria ANTES da sincronização: uma fonte que estoura
              // seu prazo não pode mais impedir a conferência de avançar nesta rodada.
              if (conferir && resta > 42_000) {
                const ch = await conferirCliente(db, cliente_id, ctx, 30_000, "automatica").catch((e) => ({ erro: mensagemCurta(e) }));
                (resultado as any)[`${cliente_id}:conferencia`] = ch;
              }
              const sobra = ORCAMENTO - (Date.now() - inicio);
              const rodada = await rodarTodas(db, cliente_id, ctx, Math.max(20_000, Math.min(sobra - 5_000, 95_000)));
              resultado[cliente_id] = rodada;
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
