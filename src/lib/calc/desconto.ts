import type { Desconto } from "../types";

// Compara competências no formato YYYY-MM.
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

// Retorna os descontos aplicáveis a uma competência (YYYY-MM).
export function descontosAplicaveis(
  descontos: Desconto[],
  competencia: string,
  escopo: "cliente" | "fechamento_inteiro",
  clienteId?: string,
): Desconto[] {
  return descontos.filter((d) => {
    if (d.escopo !== escopo) return false;
    if (escopo === "cliente" && d.clienteId !== clienteId) return false;
    if (d.recorrente) {
      if (cmp(competencia, d.competenciaInicio) < 0) return false;
      if (d.competenciaFim && cmp(competencia, d.competenciaFim) > 0) return false;
      return true;
    }
    return d.competenciaInicio === competencia;
  });
}

export interface ResultadoDesconto {
  subtotal: number;
  descontoTotal: number;
  total: number;
  aplicados: { desconto: Desconto; valor: number }[];
}

// Calcula o desconto a aplicar sobre um subtotal.
// Regras: isenção total prevalece (zera). Senão soma valores fixos + percentuais
// (percentuais aplicam sobre o subtotal original, não cumulativo).
export function calcularDesconto(subtotal: number, descontos: Desconto[]): ResultadoDesconto {
  if (descontos.length === 0) {
    return { subtotal, descontoTotal: 0, total: subtotal, aplicados: [] };
  }
  const isencao = descontos.find((d) => d.tipo === "isencao_total");
  if (isencao) {
    return {
      subtotal,
      descontoTotal: subtotal,
      total: 0,
      aplicados: [{ desconto: isencao, valor: subtotal }],
    };
  }
  const aplicados: { desconto: Desconto; valor: number }[] = [];
  let descontoTotal = 0;
  for (const d of descontos) {
    if (d.tipo === "valor") {
      const v = Math.min(d.valor ?? 0, Math.max(0, subtotal - descontoTotal));
      if (v > 0) {
        aplicados.push({ desconto: d, valor: v });
        descontoTotal += v;
      }
    } else if (d.tipo === "percentual") {
      const v = Math.max(0, ((d.valor ?? 0) / 100) * subtotal);
      const capped = Math.min(v, Math.max(0, subtotal - descontoTotal));
      if (capped > 0) {
        aplicados.push({ desconto: d, valor: capped });
        descontoTotal += capped;
      }
    }
  }
  return {
    subtotal,
    descontoTotal,
    total: Math.max(0, subtotal - descontoTotal),
    aplicados,
  };
}

export function descreverDesconto(d: Desconto): string {
  if (d.tipo === "isencao_total") return "Isenção total";
  if (d.tipo === "percentual") return `${d.valor ?? 0}%`;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(d.valor ?? 0);
}