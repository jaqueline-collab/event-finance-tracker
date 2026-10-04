import type { Cliente, FechamentoItem, Movimento, Plano } from "../types";
import { clienteSnapshotAt } from "./datas";
import { explicarReceitaCliente, type ItemReceita } from "./receita";

export type FonteComposicao = "gravada" | "reconstruida" | "so_totais";

export interface ComposicaoFechamento {
  fonte: FonteComposicao;
  planoNome: string | null;
  itens: ItemReceita[];
  subtotalSistema: number;
  acompanhamento: number;
  mauExcedenteValor: number;
  desconto: number;
  total: number;
  aviso?: string;
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);

/**
 * Composição de um cliente tal como foi faturada no fechamento. Nunca usa o
 * cadastro atual sem conferência: o total devolvido é sempre o líquido gravado.
 */
export function composicaoDoFechamento(
  item: FechamentoItem,
  cliente: Cliente | undefined,
  planos: Plano[],
  movimentos: Movimento[],
): ComposicaoFechamento {
  const snap = (item.payloadSnapshot ?? {}) as Record<string, unknown>;
  const sistema = num(snap["sistema"]);
  const acompanhamento = num(snap["acompanhamento"]);
  const mauExcedenteValor = num(snap["mauExcedenteValor"]);
  const desconto = num(item.valorDesconto);
  const total = num(item.valorLiquido);
  const planoNome =
    (snap["planoNome"] as string | null | undefined) ??
    (item.planoId ? planos.find((p) => p.id === item.planoId)?.nome ?? null : null);
  const base = { planoNome, mauExcedenteValor, desconto, total };

  const gravada = snap["composicao"] as
    | { itens?: ItemReceita[]; subtotalSistema?: number; acompanhamento?: number }
    | undefined;
  if (gravada && Array.isArray(gravada.itens)) {
    return {
      ...base,
      fonte: "gravada",
      itens: gravada.itens,
      subtotalSistema: num(gravada.subtotalSistema),
      acompanhamento: num(gravada.acompanhamento ?? acompanhamento),
    };
  }

  if (cliente && item.cicloFim) {
    const snapCli = clienteSnapshotAt(
      { ...cliente, planoId: item.planoId ?? cliente.planoId },
      movimentos,
      item.cicloFim,
    );
    const exp = explicarReceitaCliente(snapCli, planos);
    if (exp.itens.length > 0 && Math.abs(exp.subtotalSistema - sistema) <= 0.01) {
      return {
        ...base,
        fonte: "reconstruida",
        itens: exp.itens,
        subtotalSistema: exp.subtotalSistema,
        acompanhamento,
      };
    }
  }

  return {
    ...base,
    fonte: "so_totais",
    itens: [],
    subtotalSistema: sistema,
    acompanhamento,
    aviso: "Itens detalhados indisponíveis para este fechamento.",
  };
}
