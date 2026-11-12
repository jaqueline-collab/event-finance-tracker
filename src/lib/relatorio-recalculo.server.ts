/**
 * Recalcula dias já gravados do relatório diário quando os dados do espelho mudam
 * (ex.: contato que ganhou campanha depois). Sempre guarda backup das linhas
 * anteriores, só dos dias que de fato mudaram. Somente servidor.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { COLUNAS_PADRAO } from "./indicadores-motor";
import { calcularCorteCliente } from "./indicadores.server";

const COLS = COLUNAS_PADRAO.map((c) => c.chave);
const chave = (l: any) => [String(l.dia ?? l.data), l.canal ?? "", l.atendente ?? "", l.equipe ?? ""].join("|");

/** Pura: dias em que as linhas calculadas diferem das gravadas (colunas padrão). */
export function diasDiferentes(gravadas: any[], calculadas: any[], dias: string[]): string[] {
  const out: string[] = [];
  for (const d of dias) {
    const g = new Map(gravadas.filter((l) => String(l.data ?? l.dia) === d).map((l) => [chave(l), l]));
    const c = new Map(calculadas.filter((l) => String(l.dia) === d && COLS.some((k) => Number(l[k] ?? 0) !== 0)).map((l) => [chave(l), l]));
    const ks = new Set([...g.keys(), ...c.keys()]);
    if ([...ks].some((k) => COLS.some((col) => Number(g.get(k)?.[col] ?? 0) !== Number(c.get(k)?.[col] ?? 0)))) out.push(d);
  }
  return out;
}

export async function recalcularDiasGravados(db: SupabaseClient, clienteId: string, dias: string[], motivo: string) {
  const unicos = [...new Set(dias)].sort();
  if (!unicos.length) return { dias: [] as string[], backup: 0, gravadas: 0 };
  const { data: grav, error } = await db.from("elora_relatorio_diario").select("*").eq("cliente_id", clienteId).in("data", unicos);
  if (error) throw new Error(`elora_relatorio_diario: ${error.message}`);
  const comGravacao = unicos.filter((d) => (grav ?? []).some((r: any) => String(r.data) === d));
  if (!comGravacao.length) return { dias: [], backup: 0, gravadas: 0 };
  const calc = await calcularCorteCliente(db, clienteId, { de: comGravacao[0], ate: comGravacao[comGravacao.length - 1] });
  const mudaram = diasDiferentes(grav ?? [], calc.linhas as any[], comGravacao);
  let backup = 0, gravadas = 0;
  for (const d of mudaram) {
    const antigas = (grav ?? []).filter((r: any) => String(r.data) === d);
    const agora = new Date().toISOString();
    const { error: eb } = await db.from("elora_relatorio_diario_backup" as any).insert(antigas.map((r: any) => ({ ...r, backup_em: agora, backup_motivo: motivo })));
    if (eb) throw new Error(`backup: ${eb.message}`);
    backup += antigas.length;
    const linhas = (calc.linhas as any[]).filter((l) => l.dia === d && COLS.some((k) => Number(l[k] ?? 0) !== 0));
    const { data: n, error: es } = await db.rpc("substituir_relatorio_periodo" as any, { _cliente_id: clienteId, _de: d, _ate: d, _linhas: linhas });
    if (es) throw new Error(`regravar ${d}: ${es.message}`);
    gravadas += Number(n ?? 0);
  }
  return { dias: mudaram, backup, gravadas };
}
