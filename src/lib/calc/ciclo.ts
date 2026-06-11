import type { Cliente, Plano } from "../types";

const DAY_MS = 1000 * 60 * 60 * 24;

function lastDayOfMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate();
}
function clampDay(y: number, m: number, day: number): number {
  return Math.max(1, Math.min(day, lastDayOfMonth(y, m)));
}

export interface CicloFaturamento {
  inicio: Date;             // primeiro dia do ciclo (00:00 local)
  fim: Date;                // último dia do ciclo (00:00 local — inclusivo)
  diaInicial: number;       // dia configurado (1-31)
  diaFinal: number;         // dia configurado (1-31)
  proporcional: boolean;
  diasTotal: number;        // duração inclusiva em dias
}

/**
 * Resolve o ciclo de faturamento que FECHA na competência (year, month).
 * Convenção: o ciclo termina no `diaFinal` do mês y/m. Se `diaInicial <= diaFinal`
 * o ciclo é do mesmo mês; senão, começa no mês anterior (ciclo wrap-around).
 * Prioridade: cliente personalizado > plano > default 1→31.
 */
export function getCicloCliente(
  cliente: Cliente,
  plano: Plano | undefined,
  year: number,
  month: number,
): CicloFaturamento {
  const personalizado = cliente.cicloPersonalizado && cliente.cicloDiaInicial && cliente.cicloDiaFinal;
  const di = personalizado ? cliente.cicloDiaInicial! : (plano?.cicloDiaInicial ?? 1);
  const df = personalizado ? cliente.cicloDiaFinal! : (plano?.cicloDiaFinal ?? 31);

  let inicio: Date;
  let fim: Date;
  if (df >= di) {
    inicio = new Date(year, month, clampDay(year, month, di));
    fim = new Date(year, month, clampDay(year, month, df));
  } else {
    // wrap: começa no mês anterior
    const pm = month === 0 ? 11 : month - 1;
    const py = month === 0 ? year - 1 : year;
    inicio = new Date(py, pm, clampDay(py, pm, di));
    fim = new Date(year, month, clampDay(year, month, df));
  }
  const diasTotal = Math.max(1, Math.round((fim.getTime() - inicio.getTime()) / DAY_MS) + 1);
  return {
    inicio,
    fim,
    diaInicial: di,
    diaFinal: df,
    proporcional: Boolean(plano?.cobrancaProporcional),
    diasTotal,
  };
}

export function diasEntre(a: Date, b: Date): number {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / DAY_MS));
}

export function isoFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}