/**
 * Regras puras da edição de um fechamento já gerado. O servidor usa estas
 * funções para recalcular itens, totais e lançamentos e para montar o
 * histórico; nada aqui toca o banco.
 */
export interface LinhaComposicao {
  label: string;
  qtd: number;
  unit: number;
  total: number;
  incluso?: string;
}

export interface ComposicaoEditavel {
  linhas: LinhaComposicao[];
  /** Valor original do acompanhamento (guardado mesmo quando isento). */
  acompanhamentoOriginal: number;
  acompanhamentoIsento: boolean;
  mauExcedenteValor: number;
}

export interface ItemEditavel {
  id: string;
  clienteId: string;
  planoId: string | null;
  planoNome: string | null;
  clienteNome: string | null;
  cicloInicio: string | null;
  cicloFim: string | null;
  vencimento: string | null;
  valorDesconto: number;
  composicao: ComposicaoEditavel;
  lancamentoFinanceiroId: string | null;
  removido?: boolean;
  novo?: boolean;
}

export interface ItemRecalculado {
  valorBruto: number;
  valorDesconto: number;
  valorLiquido: number;
  sistema: number;
  acompanhamento: number;
}

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export function linhaTotal(l: LinhaComposicao): number {
  return r2((Number(l.qtd) || 0) * (Number(l.unit) || 0));
}

export function recalcularItem(c: ComposicaoEditavel, desconto: number): ItemRecalculado {
  const sistema = r2(c.linhas.reduce((s, l) => s + linhaTotal(l), 0));
  const acompanhamento = c.acompanhamentoIsento ? 0 : r2(c.acompanhamentoOriginal);
  const valorBruto = r2(sistema + acompanhamento + (Number(c.mauExcedenteValor) || 0));
  const valorDesconto = r2(Math.max(0, desconto));
  return { valorBruto, valorDesconto, valorLiquido: r2(valorBruto - valorDesconto), sistema, acompanhamento };
}

export function totaisFechamento(itens: { valorBruto: number; valorDesconto: number; valorLiquido: number; removido?: boolean }[]) {
  const ativos = itens.filter((i) => !i.removido);
  return {
    totalBruto: r2(ativos.reduce((s, i) => s + i.valorBruto, 0)),
    totalDesconto: r2(ativos.reduce((s, i) => s + i.valorDesconto, 0)),
    totalLiquido: r2(ativos.reduce((s, i) => s + i.valorLiquido, 0)),
  };
}

/** Novo snapshot do item: mantém o que já existia e grava a composição editada. */
export function montarSnapshot(antigo: unknown, item: ItemEditavel, calc: ItemRecalculado): Record<string, unknown> {
  const base = (antigo && typeof antigo === "object" ? antigo : {}) as Record<string, unknown>;
  return {
    ...base,
    clienteNome: item.clienteNome ?? base["clienteNome"] ?? null,
    planoNome: item.planoNome ?? null,
    sistema: calc.sistema,
    acompanhamento: calc.acompanhamento,
    acompanhamentoOriginal: r2(item.composicao.acompanhamentoOriginal),
    acompanhamentoIsento: item.composicao.acompanhamentoIsento,
    mauExcedenteValor: r2(item.composicao.mauExcedenteValor),
    composicao: {
      itens: item.composicao.linhas.map((l) => ({ ...l, total: linhaTotal(l) })),
      subtotalSistema: calc.sistema,
      acompanhamento: calc.acompanhamento,
    },
    composicaoContagemOriginal:
      base["composicaoContagemOriginal"] ??
      (base["composicao"] && !Array.isArray((base["composicao"] as any)?.itens) ? base["composicao"] : undefined),
  };
}

/** Valor de cada lançamento = soma dos líquidos dos itens ativos ligados a ele. */
export function valoresLancamentos(itens: { lancamentoFinanceiroId: string | null; valorLiquido: number; removido?: boolean }[]) {
  const ids = new Set(itens.map((i) => i.lancamentoFinanceiroId).filter((x): x is string => Boolean(x)));
  const out = new Map<string, { valor: number; semItens: boolean }>();
  for (const id of ids) {
    const ativos = itens.filter((i) => i.lancamentoFinanceiroId === id && !i.removido);
    out.set(id, { valor: r2(ativos.reduce((s, i) => s + i.valorLiquido, 0)), semItens: ativos.length === 0 });
  }
  return out;
}

export interface Edicao {
  item_id: string | null;
  campo: string;
  valor_antigo: unknown;
  valor_novo: unknown;
}

const igual = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Diferenças campo a campo entre dois objetos planos. */
export function diferencas(itemId: string | null, prefixo: string, antes: Record<string, unknown>, depois: Record<string, unknown>): Edicao[] {
  const out: Edicao[] = [];
  for (const k of Object.keys(depois)) {
    if (!igual(antes[k], depois[k])) out.push({ item_id: itemId, campo: `${prefixo}${k}`, valor_antigo: antes[k] ?? null, valor_novo: depois[k] ?? null });
  }
  return out;
}

export function rotuloAcompanhamento(snap: Record<string, unknown>): string {
  return snap["acompanhamentoIsento"] ? "Acompanhamento (isento)" : "Acompanhamento";
}

/** Composição editável inicial a partir do que está gravado. */
export function composicaoInicial(
  snap: Record<string, unknown>,
  linhasReconstruidas: LinhaComposicao[] | null,
  valorBrutoGravado?: number,
): ComposicaoEditavel {
  const num = (v: unknown) => Number(v) || 0;
  const gravada = snap["composicao"] as { itens?: LinhaComposicao[] } | undefined;
  let linhas: LinhaComposicao[];
  if (gravada && Array.isArray(gravada.itens)) linhas = gravada.itens.map((l) => ({ ...l }));
  else if (linhasReconstruidas && linhasReconstruidas.length > 0) linhas = linhasReconstruidas.map((l) => ({ ...l }));
  else linhas = num(snap["sistema"]) ? [{ label: "Sistema", qtd: 1, unit: num(snap["sistema"]), total: num(snap["sistema"]) }] : [];
  const isento = Boolean(snap["acompanhamentoIsento"]);
  const acompOrig = isento ? num(snap["acompanhamentoOriginal"]) : num(snap["acompanhamento"]);
  // Se o gravado não fecha com a soma, uma linha de ajuste preserva o bruto atual.
  if (valorBrutoGravado !== undefined) {
    const soma = linhas.reduce((s, l) => s + linhaTotal(l), 0) + (isento ? 0 : acompOrig) + num(snap["mauExcedenteValor"]);
    const dif = r2(valorBrutoGravado - soma);
    if (Math.abs(dif) >= 0.01) linhas.push({ label: "Ajuste (diferença do gravado)", qtd: 1, unit: dif, total: dif });
  }
  return {
    linhas,
    acompanhamentoIsento: isento,
    acompanhamentoOriginal: acompOrig,
    mauExcedenteValor: num(snap["mauExcedenteValor"]),
  };
}
