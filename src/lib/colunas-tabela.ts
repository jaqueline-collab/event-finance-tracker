/** Lista única "Colunas" da tabela de itens: mostrar, ocultar, reordenar e fixar à esquerda (pura). */
export type ColunaTabela = { chave: string; rotulo: string; oculta?: boolean; fixa?: boolean };
export type EstadoColunas = { ordem: string[]; ocultas: string[]; fixas: string[] };

/** ADS é só visibilidade local: nunca altera linhas, valores ou filtros. */
export const ehColunaAds = (chave: string) => /(?:_ads|Ads)$/.test(chave);
export function alternarColunasAds(e: EstadoColunas, chaves: string[], mostrar: boolean): EstadoColunas {
  const ads = chaves.filter(ehColunaAds);
  return { ...e, ocultas: mostrar ? e.ocultas.filter((k) => !ads.includes(k)) : [...new Set([...e.ocultas, ...ads])] };
}

export const estadoInicial = (cols: ColunaTabela[]): EstadoColunas => ({
  ordem: cols.map((c) => c.chave),
  ocultas: cols.filter((c) => c.oculta).map((c) => c.chave),
  fixas: cols.filter((c) => c.fixa).map((c) => c.chave),
});

/** Colunas na ordem escolhida, as fixas primeiro (na mesma ordem relativa); as ocultas ficam de fora. */
export function colunasVisiveis<T extends ColunaTabela>(cols: T[], e: EstadoColunas): (T & { fixa: boolean })[] {
  const pos = new Map(e.ordem.map((k, i) => [k, i]));
  const ord = [...cols].sort((a, b) => (pos.get(a.chave) ?? 1e9) - (pos.get(b.chave) ?? 1e9));
  const vis = ord.filter((c) => !e.ocultas.includes(c.chave)).map((c) => ({ ...c, fixa: e.fixas.includes(c.chave) }));
  return [...vis.filter((c) => c.fixa), ...vis.filter((c) => !c.fixa)];
}

export function moverColuna<T>(lista: T[], i: number, delta: number): T[] {
  const j = i + delta;
  if (j < 0 || j >= lista.length) return lista;
  const l = [...lista];
  [l[i], l[j]] = [l[j], l[i]];
  return l;
}

/** Agrupar: grupos na ordem conhecida (etapas do funil) quando houver; vazio sempre por último. */
export function compararGrupo(a: string, b: string, ordem?: string[]): number {
  if (a === b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const ia = ordem?.indexOf(a) ?? -1, ib = ordem?.indexOf(b) ?? -1;
  if (ia >= 0 && ib >= 0) return ia - ib;
  if (ia >= 0) return -1;
  if (ib >= 0) return 1;
  return a.localeCompare(b, "pt-BR");
}

/** Alinhamento único das tabelas: número centralizado com dígitos tabulares; texto (e Dia) à esquerda. */
export const alinhamento = (numerica: boolean) => (numerica ? "text-center tabular-nums" : "text-left");
const NUM = /^(R\$\s?)?-?\d{1,3}(\.\d{3})*(,\d+)?%?$|^(R\$\s?)?-?\d+(,\d+)?%?$|^\d+h( \d+min)?$|^\d+min( \d+s)?$|^\d+s$/;
/** Coluna é numérica quando todo valor preenchido parece número (moeda, %, duração); vazio não decide. */
export function colunaNumerica(valores: (string | null | undefined)[]): boolean {
  const cheios = valores.map((v) => (v ?? "").trim()).filter(Boolean);
  return cheios.length > 0 && cheios.every((v) => NUM.test(v));
}
