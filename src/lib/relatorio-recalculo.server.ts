/**
 * Recalcula dias já gravados do relatório diário quando os dados do espelho mudam
 * (ex.: contato que ganhou campanha depois). Sempre guarda backup das linhas
 * anteriores, só dos dias que de fato mudaram. Somente servidor.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { COLUNAS_PADRAO } from "./indicadores-motor";
import { calcularCorteCliente } from "./indicadores.server";

const COLS = COLUNAS_PADRAO.map((c) => c.chave);

/**
 * Pura: dias em que o total do dia (colunas padrão) calculado difere do gravado.
 * Compara totais, não a quebra por canal/atendente/equipe, para uma mudança só de
 * configuração (ex.: mapa de equipe) não reescrever dias cujos números não mudaram.
 */
export function diasDiferentes(gravadas: any[], calculadas: any[], dias: string[]): string[] {
  const soma = (ls: any[], d: string, col: string, k: "data" | "dia") => ls.filter((l) => String(l[k] ?? l.dia) === d).reduce((a, l) => a + Number(l[col] ?? 0), 0);
  return dias.filter((d) => COLS.some((col) => soma(gravadas, d, col, "data") !== soma(calculadas, d, col, "dia")));
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
