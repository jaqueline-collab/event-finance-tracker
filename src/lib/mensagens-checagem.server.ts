/**
 * Checagem semanal de mensagens: para cada um dos últimos 7 dias, sorteia
 * atendimentos com mensagem no dia, conta as mensagens do dia direto no Elora
 * e compara com o espelho. Só confere e registra (elora_checagem_mensagens).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { chamarElora, itensDe, mapMensagem, mensagensDoPeriodo, PAGE_SIZE, type Contexto } from "./elora-espelho.server";
import { diaSP } from "./painel-visual";

export const INTERVALO_CHECAGEM_MS = 7 * 86_400_000;
const AMOSTRA_POR_DIA = 4;

export async function checagemVencida(db: SupabaseClient, clienteId: string, agora = Date.now()) {
  const { data } = await (db as any).from("elora_checagem_mensagens").select("checado_em").eq("cliente_id", clienteId).order("checado_em", { ascending: false }).limit(1).maybeSingle();
  return !data || agora - new Date(data.checado_em).getTime() >= INTERVALO_CHECAGEM_MS;
}

export async function checarMensagensSemana(db: SupabaseClient, clienteId: string, ctx: Contexto, prazoMs = 20_000) {
  const inicio = Date.now();
  const ate = new Date();
  const de = new Date(ate.getTime() - 7 * 86_400_000);
  const data = await mensagensDoPeriodo(db, clienteId, de.toISOString(), ate.toISOString());
  const porDia = new Map<string, Map<string, number>>();
  for (const m of data ?? []) {
    const d = diaSP(m.enviada_em);
    if (!d) continue;
    const s = porDia.get(d) ?? new Map<string, number>();
    s.set(String(m.sessao_id), (s.get(String(m.sessao_id)) ?? 0) + 1);
    porDia.set(d, s);
  }
  const linhas: any[] = [];
  const checado_em = new Date().toISOString();
  for (const [dia, sessoes] of [...porDia.entries()].sort()) {
    const ids = [...sessoes.keys()].sort(() => Math.random() - 0.5).slice(0, AMOSTRA_POR_DIA);
    let nosso = 0, elora = 0, amostra = 0;
    for (const sid of ids) {
      if (Date.now() - inicio > prazoMs) break;
      let n = 0;
      for (let p = 1; p < 50; p++) {
        const j = await chamarElora(ctx, `/chat/v1/message?SessionId=${sid}&PageNumber=${p}&PageSize=${PAGE_SIZE}`);
        const itens = itensDe(j);
        n += itens.filter((m) => diaSP(mapMensagem(clienteId, m, sid).enviada_em) === dia).length;
        if (!j?.hasMorePages || !itens.length) break;
      }
      elora += n;
      nosso += sessoes.get(sid) ?? 0;
      amostra++;
    }
    if (amostra) linhas.push({ cliente_id: clienteId, checado_em, dia, amostra, nosso, elora, diferenca: elora - nosso });
  }
  if (linhas.length) await (db as any).from("elora_checagem_mensagens").insert(linhas);
  return linhas;
}
