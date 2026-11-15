/**
 * Orquestra a sincronização de um cliente (agendada ou manual): trava por
 * cliente, roda as fontes em ordem e grava o erro real de cada fonte em
 * elora_sync_estado (ultimo_erro), sem interromper as demais.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Contexto } from "./elora-espelho.server";

export const FONTES_SYNC = ["apoio", "contatos", "atendimentos", "mensagens", "cards"] as const;
export type FonteSync = (typeof FONTES_SYNC)[number];
/** Trava dura um pouco mais que a maior execução; expira sozinha se a execução morrer. */
export const TRAVA_SEGUNDOS = 180;

/** Mensagem curta e sem segredo para mostrar à super admin. */
export function mensagemCurta(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e ?? "erro desconhecido");
  return m.replace(/(apikey|authorization|bearer)[^\s]*/gi, "[oculto]").slice(0, 300);
}

export async function pegarTrava(db: SupabaseClient, clienteId: string, dono: string) {
  const { data, error } = await (db as any).rpc("elora_pegar_trava", { _cliente_id: clienteId, _dono: dono, _segundos: TRAVA_SEGUNDOS });
  if (error) throw new Error(`trava: ${error.message}`);
  return data === true;
}
export async function soltarTrava(db: SupabaseClient, clienteId: string, dono: string) {
  await (db as any).rpc("elora_soltar_trava", { _cliente_id: clienteId, _dono: dono });
}

async function gravarErro(db: SupabaseClient, clienteId: string, fonte: FonteSync, msg: string | null) {
  await (db as any)
    .from("elora_sync_estado")
    .update(msg ? { ultimo_erro: msg, ultimo_erro_em: new Date().toISOString() } : { ultimo_erro: null, ultimo_erro_em: null })
    .eq("cliente_id", clienteId)
    .eq("fonte", fonte);
}

export type ResultadoFonte = { fonte: FonteSync; concluido: boolean; registros: number; erro?: string };

/** Roda uma fonte e grava o resultado (erro ou limpeza do erro anterior). */
export async function rodarFonte(db: SupabaseClient, clienteId: string, fonte: FonteSync, ctx: Contexto, prazoMs: number): Promise<ResultadoFonte> {
  try {
    const r =
      fonte === "cards"
        ? await (await import("./elora-cards.server")).sincronizarCards(db, clienteId, ctx, prazoMs)
        : await (await import("./elora-espelho.server")).sincronizarFonte(db, clienteId, fonte, ctx, prazoMs);
    if (r.concluido) await gravarErro(db, clienteId, fonte, null);
    return { fonte, concluido: r.concluido, registros: r.registros };
  } catch (e) {
    const msg = mensagemCurta(e);
    await gravarErro(db, clienteId, fonte, msg);
    return { fonte, concluido: false, registros: 0, erro: msg };
  }
}

/**
 * Roda todas as fontes em sequência dentro do orçamento. Uma fonte com erro
 * não impede as próximas. Cada fonte retoma do cursor salvo.
 */
export async function rodarTodas(
  db: SupabaseClient,
  clienteId: string,
  ctx: Contexto,
  orcamentoMs: number,
  rodar: typeof rodarFonte = rodarFonte,
): Promise<ResultadoFonte[]> {
  const inicio = Date.now();
  const out: ResultadoFonte[] = [];
  for (const f of FONTES_SYNC) {
    const resta = orcamentoMs - (Date.now() - inicio);
    if (resta < 3_000) break;
    out.push(await rodar(db, clienteId, f, ctx, Math.min(25_000, resta)));
  }
  return out;
}

/** Horas sem atualizar a partir das quais a super admin vê alerta. */
export const HORAS_ALERTA = 6;
export function fontesParadas(estados: { fonte: string; atualizado_em: string | null }[], agora = Date.now()) {
  return FONTES_SYNC.filter((f) => {
    const e = estados.find((x) => x.fonte === f);
    return !e?.atualizado_em || agora - new Date(e.atualizado_em).getTime() > HORAS_ALERTA * 3_600_000;
  });
}
/** "Dados atualizados até": a conclusão mais antiga entre as fontes do painel (nunca promete mais). */
export function atualizadoAte(estados: { fonte: string; concluido_em: string | null }[]): string | null {
  const fs = ["contatos", "atendimentos", "mensagens", "cards"];
  const ds = fs.map((f) => estados.find((e) => e.fonte === f)?.concluido_em ?? null);
  if (ds.some((d) => !d)) return ds.filter(Boolean).sort()[0] ?? null;
  return (ds as string[]).sort()[0];
}
