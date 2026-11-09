import type { Cliente, Plano } from "../types";
import { getCicloCliente } from "./ciclo";
import { normalizarDataVencimento, parseDiaVencimento } from "./datas";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const noon = (v: string) => new Date(`${v}T12:00:00`);

/** O cliente entra no ciclo da competência ("YYYY-MM")? Mesma regra do vencimento da competência. */
export function incluidoNaCompetencia(cliente: Cliente, plano: Plano | undefined, competencia: string): boolean {
  const [y, m] = competencia.split("-").map(Number);
  if (!y || !m || !ISO.test(cliente.dataInicio)) return false;
  const ciclo = getCicloCliente(cliente, plano, y, m - 1);
  const fim = new Date(ciclo.fim.getFullYear(), ciclo.fim.getMonth(), ciclo.fim.getDate(), 23, 59);
  if (noon(cliente.dataInicio) > fim) return false;
  if (cliente.dataChurn && ISO.test(cliente.dataChurn) && noon(cliente.dataChurn) < ciclo.inicio) return false;
  return true;
}

/** Competências cuja inclusão muda ao trocar a data de início. */
export function competenciasQueMudam(
  cliente: Cliente,
  plano: Plano | undefined,
  novaData: string,
  competencias: string[],
): { competencia: string; antes: boolean; depois: boolean }[] {
  const novo = { ...cliente, dataInicio: novaData };
  return [...new Set(competencias)]
    .map((competencia) => ({
      competencia,
      antes: incluidoNaCompetencia(cliente, plano, competencia),
      depois: incluidoNaCompetencia(novo, plano, competencia),
    }))
    .filter((c) => c.antes !== c.depois);
}

/** Próximo vencimento a partir da nova data, mantendo o dia que está no cliente (nunca o do plano). */
export function proximoVencimentoMantendoDia(novaData: string, dataVencimentoAtual?: string | null): string | null {
  const dia = parseDiaVencimento(dataVencimentoAtual);
  return normalizarDataVencimento(novaData, dia ? String(dia) : null);
}

export const dataBr = (iso: string) => iso.split("-").reverse().join("/");
