/**
 * Layout dos blocos de uma visão: grade de 12 colunas, regras puras.
 * Gravado dentro de cada cartão (largura/altura) da própria visão do cliente.
 */
import { CARTOES_KPI, CARTOES_PAINEL, type CartaoGrafico, type TipoGrafico } from "./graficos";

export const COLUNAS = 12;
/** Altura de uma linha da grade, em px. */
export const LINHA_PX = 120;
/** Abaixo desta largura o bloco ocupa a linha toda e não redimensiona. */
export const LARGURA_GRADE_PX = 834;

type Limite = { minL: number; maxL: number; minA: number; maxA: number; l: number; a: number };
const LIMITES: Record<TipoGrafico, Limite> = {
  numero: { minL: 3, maxL: 6, minA: 1, maxA: 2, l: 3, a: 1 },
  barras: { minL: 3, maxL: 12, minA: 2, maxA: 6, l: 6, a: 3 },
  barras_empilhadas: { minL: 3, maxL: 12, minA: 2, maxA: 6, l: 6, a: 3 },
  linhas: { minL: 3, maxL: 12, minA: 2, maxA: 6, l: 6, a: 3 },
  area: { minL: 3, maxL: 12, minA: 2, maxA: 6, l: 6, a: 3 },
  pizza: { minL: 3, maxL: 8, minA: 2, maxA: 5, l: 6, a: 3 },
  rosca: { minL: 3, maxL: 8, minA: 2, maxA: 5, l: 6, a: 3 },
  funil: { minL: 3, maxL: 12, minA: 2, maxA: 6, l: 6, a: 3 },
  tabela: { minL: 4, maxL: 12, minA: 2, maxA: 8, l: 6, a: 3 },
  mapa: { minL: 4, maxL: 12, minA: 2, maxA: 6, l: 6, a: 3 },
  calendario: { minL: 6, maxL: 12, minA: 3, maxA: 8, l: 12, a: 4 },
};
export const limiteDe = (t: TipoGrafico) => LIMITES[t];

const prender = (v: number, a: number, b: number) => Math.max(a, Math.min(b, Math.round(v)));

/** Largura/altura efetivas (padrão do tipo ou o valor gravado, sempre dentro dos limites). */
export function tamanhoDe(c: Pick<CartaoGrafico, "tipo" | "largura" | "altura" | "tamanho">): { largura: number; altura: number } {
  const L = LIMITES[c.tipo];
  const l = c.largura ?? (c.tamanho === "inteiro" ? 12 : L.l);
  return { largura: prender(l, L.minL, L.maxL), altura: prender(c.altura ?? L.a, L.minA, L.maxA) };
}

/** Redimensiona com encaixe na grade e limites por tipo. */
export function redimensionar<C extends CartaoGrafico>(c: C, largura: number, altura: number): C {
  const L = LIMITES[c.tipo];
  return { ...c, largura: prender(largura, L.minL, L.maxL), altura: prender(altura, L.minA, L.maxA) };
}

/** Converte arrasto em px para colunas/linhas da grade. */
export function encaixar(px: number, unidade: number): number {
  return unidade > 0 ? Math.round(px / unidade) : 0;
}

/** Move um bloco para a posição de outro (reordena entre linhas). */
export function reordenar<C extends { id: string }>(l: C[], de: string, para: string): C[] {
  const i = l.findIndex((c) => c.id === de);
  const j = l.findIndex((c) => c.id === para);
  if (i < 0 || j < 0 || i === j) return l;
  const n = [...l];
  const [x] = n.splice(i, 1);
  n.splice(j, 0, x);
  return n;
}

const ORDEM_PADRAO = [...CARTOES_KPI, ...CARTOES_PAINEL].map((c) => c.id);

/** Layout padrão da visão: tamanhos do tipo e blocos padrão na ordem original. Nenhum bloco é removido. */
export function layoutPadrao<C extends CartaoGrafico>(l: C[]): C[] {
  const pos = (c: C) => { const i = ORDEM_PADRAO.indexOf(c.painel ?? ""); return i < 0 ? ORDEM_PADRAO.length : i; };
  return l
    .map((c, i) => ({ c, i }))
    .sort((a, b) => pos(a.c) - pos(b.c) || a.i - b.i)
    .map(({ c }) => {
      const { largura: _l, altura: _a, ...resto } = c;
      const padrao = CARTOES_KPI.find((k) => k.id === c.painel);
      return (padrao ? { ...resto, largura: padrao.largura, altura: padrao.altura } : resto) as C;
    });
}

/** Desfazer/refazer das alterações de layout na sessão de edição. */
export type Historico<T> = { passado: T[]; presente: T; futuro: T[] };
export const historico = <T,>(presente: T): Historico<T> => ({ passado: [], presente, futuro: [] });
export const empurrar = <T,>(h: Historico<T>, novo: T, max = 50): Historico<T> => ({ passado: [...h.passado, h.presente].slice(-max), presente: novo, futuro: [] });
export const desfazer = <T,>(h: Historico<T>): Historico<T> =>
  h.passado.length ? { passado: h.passado.slice(0, -1), presente: h.passado[h.passado.length - 1], futuro: [h.presente, ...h.futuro] } : h;
export const refazer = <T,>(h: Historico<T>): Historico<T> =>
  h.futuro.length ? { passado: [...h.passado, h.presente], presente: h.futuro[0], futuro: h.futuro.slice(1) } : h;
