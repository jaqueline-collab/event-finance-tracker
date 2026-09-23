/**
 * Grade do construtor de painel ("Meu Dash").
 *
 * Lógica pura, sem React: colisão, empurrar-para-baixo e compactação para
 * cima, no mesmo comportamento de qualquer painel de dashboard. A grade tem
 * 12 colunas; cada bloco ocupa {x, y, w, h} em células.
 */

export const COLUNAS = 12;
export const MIN_W = 3;
export const MIN_H = 2;

export type Layout = { x: number; y: number; w: number; h: number };
export type ItemGrade<T = unknown> = { id: string; layout: Layout; item: T };

const limitar = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function sanearLayout(bruto: unknown): Layout | null {
  if (!bruto || typeof bruto !== "object") return null;
  const l = bruto as Record<string, unknown>;
  if (typeof l.w !== "number" || typeof l.h !== "number") return null;
  const w = limitar(Math.round(l.w), MIN_W, COLUNAS);
  const h = Math.max(MIN_H, Math.round(l.h));
  const x = limitar(Math.round(Number(l.x ?? 0)), 0, COLUNAS - w);
  const y = Math.max(0, Math.round(Number(l.y ?? 0)));
  return { x, y, w, h };
}

const colide = (a: Layout, b: Layout) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Empurra para baixo tudo que colidir com `movido`, em cascata. */
function empurrar<T>(itens: ItemGrade<T>[], movidoId: string): ItemGrade<T>[] {
  const lista = itens.map((i) => ({ ...i, layout: { ...i.layout } }));
  const fixo = lista.find((i) => i.id === movidoId);
  if (!fixo) return lista;

  const resolvidos = new Set<string>([movidoId]);
  let mudou = true;
  let voltas = 0;
  while (mudou && voltas < 200) {
    mudou = false;
    voltas++;
    for (const alvo of lista) {
      if (alvo.id === movidoId) continue;
      for (const outro of lista) {
        if (outro.id === alvo.id) continue;
        if (!resolvidos.has(outro.id) && outro.id !== movidoId) continue;
        if (colide(alvo.layout, outro.layout)) {
          alvo.layout.y = outro.layout.y + outro.layout.h;
          resolvidos.add(alvo.id);
          mudou = true;
        }
      }
    }
  }
  return lista;
}

/** Sobe cada bloco até encostar, preservando a ordem visual. */
export function compactar<T>(itens: ItemGrade<T>[]): ItemGrade<T>[] {
  const ordenados = [...itens].sort((a, b) => a.layout.y - b.layout.y || a.layout.x - b.layout.x);
  const postos: ItemGrade<T>[] = [];
  for (const i of ordenados) {
    const l = { ...i.layout };
    while (l.y > 0) {
      const tentativa = { ...l, y: l.y - 1 };
      if (postos.some((p) => colide(p.layout, tentativa))) break;
      l.y = tentativa.y;
    }
    postos.push({ ...i, layout: l });
  }
  return postos;
}

/** Primeira posição livre para um bloco novo. */
export function proximaPosicao(itens: ItemGrade[], w = 6, h = 4): Layout {
  const maxY = itens.reduce((m, i) => Math.max(m, i.layout.y + i.layout.h), 0);
  for (let y = 0; y <= maxY; y++) {
    for (let x = 0; x + w <= COLUNAS; x++) {
      const tentativa = { x, y, w, h };
      if (!itens.some((i) => colide(i.layout, tentativa))) return tentativa;
    }
  }
  return { x: 0, y: maxY, w, h };
}

/**
 * Garante layout válido para todos: quem não tiver é posicionado em sequência,
 * seguindo a ordem salva.
 */
export function normalizarGrade<T extends { id: string; ordem?: number; layout?: unknown }>(
  itens: T[],
): ItemGrade<T>[] {
  const ordenados = [...itens].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  const grade: ItemGrade<T>[] = [];
  for (const i of ordenados) {
    const l = sanearLayout(i.layout);
    grade.push({ id: i.id, item: i, layout: l ?? proximaPosicao(grade) });
  }
  return compactar(grade);
}

export function moverBloco<T>(itens: ItemGrade<T>[], id: string, x: number, y: number) {
  const lista = itens.map((i) =>
    i.id === id
      ? {
          ...i,
          layout: {
            ...i.layout,
            x: limitar(Math.round(x), 0, COLUNAS - i.layout.w),
            y: Math.max(0, Math.round(y)),
          },
        }
      : i,
  );
  return compactar(empurrar(lista, id));
}

export function redimensionarBloco<T>(itens: ItemGrade<T>[], id: string, w: number, h: number) {
  const lista = itens.map((i) => {
    if (i.id !== id) return i;
    const larg = limitar(Math.round(w), MIN_W, COLUNAS - i.layout.x);
    return { ...i, layout: { ...i.layout, w: larg, h: Math.max(MIN_H, Math.round(h)) } };
  });
  return compactar(empurrar(lista, id));
}

/** Ordem de empilhamento no celular: de cima para baixo, da esquerda para a direita. */
export function ordemVisual<T>(itens: ItemGrade<T>[]): ItemGrade<T>[] {
  return [...itens].sort((a, b) => a.layout.y - b.layout.y || a.layout.x - b.layout.x);
}
