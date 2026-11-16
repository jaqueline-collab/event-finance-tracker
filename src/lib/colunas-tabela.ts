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

/* ---------- Ordenar qualquer coluna (uma por vez) ---------- */
export type OrdemTabela = { col: string; desc: boolean } | null;

/** Clique no título: crescente → decrescente → padrão da tabela (o padrão nunca é gravado por quem vê). */
export function cicloOrdem(atual: OrdemTabela, col: string, padrao: OrdemTabela = null): OrdemTabela {
  if (!atual || atual.col !== col) return { col, desc: false };
  if (!atual.desc) return { col, desc: true };
  return padrao && padrao.col === col && padrao.desc ? null : padrao;
}

const DATA_BR = /^(\d{2})\/(\d{2})\/(\d{2,4})(?:[ ,]+(\d{2}):(\d{2}))?/;
const DATA_ISO = /^\d{4}-\d{2}-\d{2}/;
const DUR = /^(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)min)?\s*(?:(\d+)s)?$/;

/** Chave de ordenação: data real (BR ou ISO), número (R$, %, milhar), duração; senão texto. Vazio → null. */
export function chaveOrdenacao(v: string | null | undefined): { n: number } | { t: string } | null {
  const s = (v ?? "").trim();
  if (!s) return null;
  if (DATA_ISO.test(s)) { const t = Date.parse(s.length === 10 ? `${s}T00:00:00Z` : s); if (Number.isFinite(t)) return { n: t }; }
  const br = DATA_BR.exec(s);
  if (br) { const ano = br[3].length === 2 ? 2000 + Number(br[3]) : Number(br[3]); return { n: Date.UTC(ano, Number(br[2]) - 1, Number(br[1]), Number(br[4] ?? 0), Number(br[5] ?? 0)) }; }
  const num = s.replace(/^R\$\s?/, "").replace(/%$/, "");
  if (/^-?\d{1,3}(\.\d{3})*(,\d+)?$|^-?\d+(,\d+)?$/.test(num)) return { n: Number(num.replace(/\./g, "").replace(",", ".")) };
  if (/^-?\d+(\.\d+)?$/.test(s)) return { n: Number(s) };
  const d = DUR.exec(s);
  if (d && /\d/.test(s)) return { n: (Number(d[1] ?? 0) * 86400) + (Number(d[2] ?? 0) * 3600) + (Number(d[3] ?? 0) * 60) + Number(d[4] ?? 0) };
  return { t: s };
}

/** Compara dois valores para a ordem pedida; vazio sempre por último, nos dois sentidos. */
export function compararValores(a: string | null | undefined, b: string | null | undefined, desc: boolean): number {
  const x = chaveOrdenacao(a), y = chaveOrdenacao(b);
  if (!x && !y) return 0;
  if (!x) return 1;
  if (!y) return -1;
  const r = "n" in x && "n" in y ? x.n - y.n : String("n" in x ? x.n : x.t).localeCompare(String("n" in y ? y.n : y.t), "pt-BR", { numeric: true, sensitivity: "base" });
  return desc ? -r : r;
}
