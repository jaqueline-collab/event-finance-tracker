/**
 * Visão Matriz (lógica pura): um dia por linha, uma coluna por indicador.
 * Colunas vêm da configuração do cliente; nada de cliente fixo aqui.
 */
import { COLUNAS_PADRAO, type Celula, type IndicadorConfig, type PorDia } from "./indicadores-motor";
import { NAO_DEFINIDO } from "./nao-definido";

export type TipoColuna = "app" | "manual" | "combinada" | "formula";
export type Formato = "numero" | "percentual" | "moeda";
export type OpFormula = "soma" | "diferenca" | "razao" | "percentual";
export type Formula = { op: OpFormula; a: string; b: string };

export type ColunaMatriz = {
  chave: string;
  nome: string;
  tipo: TipoColuna;
  formato: Formato;
  ordem: number;
  ativo: boolean;
  formula?: Formula | null;
  /** Regra da coluna combinada (para o editor). */
  evento?: unknown;
  condicoes?: unknown;
};

export type ConfigMatriz = IndicadorConfig & { formato?: Formato | null; formula?: Formula | null };

const CHAVES_PADRAO = new Set<string>(COLUNAS_PADRAO.map((c) => c.chave));
export const ehChavePadrao = (k: string) => CHAVES_PADRAO.has(k);

/** Padrão do sistema (com ordem/ativo da configuração, se houver) + colunas do cliente. */
export function colunasMatriz(configs: ConfigMatriz[]): ColunaMatriz[] {
  const porChave = new Map(configs.map((c) => [c.chave, c]));
  const padrao: ColunaMatriz[] = COLUNAS_PADRAO.map((c, i) => {
    const o = porChave.get(c.chave);
    return { chave: c.chave, nome: c.nome, tipo: "app", formato: "numero", ordem: o?.ordem ?? i, ativo: o?.ativo ?? true };
  });
  const doCliente: ColunaMatriz[] = configs
    .filter((c) => !ehChavePadrao(c.chave))
    .map((c) => ({
      chave: c.chave,
      nome: c.nome,
      tipo: c.tipo === "app" ? "combinada" : c.tipo,
      formato: (c.formato as Formato) || "numero",
      ordem: c.ordem,
      ativo: c.ativo,
      formula: c.formula ?? null,
      evento: c.evento,
      condicoes: c.condicoes,
    }));
  return [...padrao, ...doCliente].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome));
}

export type CelulaMatriz = { valor: number | null; estimado: boolean; erro?: string };
export type LinhaMatriz = { dia: string; celulas: Record<string, CelulaMatriz> };

const norm = (s: string) => s.trim().toLowerCase();

function aplicar(op: OpFormula, a: number | null, b: number | null): number | null {
  const x = a ?? 0;
  const y = b ?? 0;
  switch (op) {
    case "soma":
      return x + y;
    case "diferenca":
      return x - y;
    case "razao":
      return y === 0 ? null : x / y;
    case "percentual":
      return y === 0 ? null : (x / y) * 100;
  }
}

/** Erro de configuração da fórmula (referência inexistente ou ciclo); null = ok. */
export function erroFormula(col: ColunaMatriz, colunas: ColunaMatriz[]): string | null {
  const f = col.formula;
  if (!f || !f.op || !f.a || !f.b) return "fórmula incompleta";
  const porNome = new Map(colunas.map((c) => [norm(c.nome), c]));
  for (const ref of [f.a, f.b]) {
    const alvo = porNome.get(norm(ref));
    if (!alvo) return `coluna "${ref}" não existe`;
    if (alvo.chave === col.chave) return "a fórmula usa a própria coluna";
  }
  // ciclo simples entre fórmulas
  const visitados = new Set<string>();
  const ciclo = (c: ColunaMatriz): boolean => {
    if (c.tipo !== "formula" || !c.formula) return false;
    if (visitados.has(c.chave)) return true;
    visitados.add(c.chave);
    const r = [c.formula.a, c.formula.b].map((n) => porNome.get(norm(n))).filter(Boolean) as ColunaMatriz[];
    const res = r.some(ciclo);
    visitados.delete(c.chave);
    return res;
  };
  return ciclo(col) ? "fórmulas se referenciam em ciclo" : null;
}

function resolver(colunas: ColunaMatriz[], base: (chave: string) => CelulaMatriz): Record<string, CelulaMatriz> {
  const porNome = new Map(colunas.map((c) => [norm(c.nome), c]));
  const out: Record<string, CelulaMatriz> = {};
  for (const c of colunas) if (c.tipo !== "formula") out[c.chave] = base(c.chave);
  const calc = (c: ColunaMatriz, prof = 0): CelulaMatriz => {
    if (out[c.chave]) return out[c.chave];
    const erro = erroFormula(c, colunas);
    if (erro || prof > 20) return (out[c.chave] = { valor: null, estimado: false, erro: erro ?? "fórmula profunda demais" });
    const a = calc(porNome.get(norm(c.formula!.a))!, prof + 1);
    const b = calc(porNome.get(norm(c.formula!.b))!, prof + 1);
    if (a.erro || b.erro) return (out[c.chave] = { valor: null, estimado: false, erro: "depende de coluna com erro" });
    return (out[c.chave] = { valor: aplicar(c.formula!.op, a.valor, b.valor), estimado: a.estimado || b.estimado });
  };
  for (const c of colunas) if (c.tipo === "formula") calc(c);
  return out;
}

/**
 * Monta a Matriz. `calculado` = padrão + combinadas por dia; `manuais` = dia → chave → valor.
 * O total soma só dias do período; se algum dia somado é estimado, o total leva a marca.
 */
export function montarMatriz(
  colunas: ColunaMatriz[],
  dias: string[],
  calculado: PorDia,
  manuais: Map<string, Record<string, number>>,
) {
  const ativas = colunas.filter((c) => c.ativo);
  const celulaBase = (dia: string | null) => (chave: string): CelulaMatriz => {
    const col = ativas.find((c) => c.chave === chave)!;
    if (col.tipo === "manual") {
      if (dia) {
        const v = manuais.get(dia)?.[chave];
        return { valor: v ?? null, estimado: false };
      }
      let soma: number | null = null;
      for (const d of dias) {
        const v = manuais.get(d)?.[chave];
        if (v != null) soma = (soma ?? 0) + v;
      }
      return { valor: soma, estimado: false };
    }
    if (dia) {
      const c: Celula | undefined = calculado.get(dia)?.[chave];
      return { valor: c?.valor ?? 0, estimado: (c?.estimado ?? 0) > 0 };
    }
    let valor = 0;
    let est = false;
    for (const d of dias) {
      const c = calculado.get(d)?.[chave];
      valor += c?.valor ?? 0;
      if ((c?.estimado ?? 0) > 0) est = true;
    }
    return { valor, estimado: est };
  };
  const linhas: LinhaMatriz[] = dias.map((dia) => ({ dia, celulas: resolver(ativas, celulaBase(dia)) }));
  const total = resolver(ativas, celulaBase(null));
  const erros = ativas
    .filter((c) => c.tipo === "formula")
    .map((c) => ({ chave: c.chave, nome: c.nome, erro: erroFormula(c, ativas) }))
    .filter((e): e is { chave: string; nome: string; erro: string } => !!e.erro);
  return { colunas: ativas, linhas, total, erros };
}

/** Linhas por canal/atendente/equipe → soma por dia, com filtros opcionais ("Não definido" = vazio). */
export type LinhaCorteMatriz = { dia: string; canal: string; atendente: string; equipe: string } & Record<string, unknown>;
export type FiltrosMatriz = Partial<Record<"canal" | "atendente" | "equipe", string>>;

export function somarPadraoPorDia(linhas: LinhaCorteMatriz[], filtros: FiltrosMatriz, m: PorDia = new Map()): PorDia {
  const ok = (v: string, f?: string) => !f || (v || NAO_DEFINIDO) === f;
  for (const l of linhas) {
    if (!ok(l.canal, filtros.canal) || !ok(l.atendente, filtros.atendente) || !ok(l.equipe, filtros.equipe)) continue;
    const linha = m.get(l.dia) ?? {};
    for (const c of COLUNAS_PADRAO) {
      const cel = linha[c.chave] ?? { valor: 0, estimado: 0 };
      cel.valor += Number(l[c.chave] ?? 0);
      linha[c.chave] = cel;
    }
    m.set(l.dia, linha);
  }
  return m;
}

/** Valores distintos de cada dimensão (só as que têm mais de um valor viram chip). */
export function opcoesDimensoes(linhas: LinhaCorteMatriz[]) {
  const out: Record<"canal" | "atendente" | "equipe", string[]> = { canal: [], atendente: [], equipe: [] };
  for (const k of Object.keys(out) as (keyof typeof out)[]) {
    out[k] = [...new Set(linhas.map((l) => l[k] || NAO_DEFINIDO))].sort((a, b) =>
      a === NAO_DEFINIDO ? 1 : b === NAO_DEFINIDO ? -1 : a.localeCompare(b),
    );
  }
  return out;
}

export function slugColuna(nome: string, existentes: string[]): string {
  const base =
    nome
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 40) || "coluna";
  let k = base;
  let i = 2;
  const usados = new Set(existentes);
  while (usados.has(k) || ehChavePadrao(k)) k = `${base}_${i++}`;
  return k;
}
