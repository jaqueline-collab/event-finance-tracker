/**
 * Construtor de gráficos (Fase 4): configuração de cartão e agregação pura.
 * Lê só o catálogo Campos do Elora (rótulos/ocultos) e a base de campos;
 * nada específico de cliente. Valor ausente = "Não definido".
 */
import { z } from "zod";
import { aplicarFiltrosCampos, filtroCampoSchema, preenchidoCampo, valorDe, type BaseCampos, type CampoCatalogo, type FiltroCampo, type FonteCampo, type GrupoCatalogo } from "./campos-elora";
import { NAO_DEFINIDO } from "./nao-definido";
import { diaSP, periodoAnterior, type Periodo } from "./painel-visual";

export const TIPOS_GRAFICO = ["numero", "barras", "barras_empilhadas", "linhas", "area", "pizza", "rosca", "funil", "tabela", "mapa"] as const;
export type TipoGrafico = (typeof TIPOS_GRAFICO)[number];
export const ROTULO_TIPO_GRAFICO: Record<TipoGrafico, string> = {
  numero: "Número grande", barras: "Barras", barras_empilhadas: "Barras empilhadas", linhas: "Linhas", area: "Área",
  pizza: "Pizza", rosca: "Rosca", funil: "Funil", tabela: "Tabela", mapa: "Mapa",
};
export const MEDIDAS = ["contagem", "distinta", "soma", "media", "tempo_medio", "indicador"] as const;
export type Medida = (typeof MEDIDAS)[number];
export const ROTULO_MEDIDA: Record<Medida, string> = {
  contagem: "Contagem", distinta: "Contagem distinta (contatos)", soma: "Soma", media: "Média", tempo_medio: "Tempo médio", indicador: "Indicador da Matriz",
};

const ref = z.object({ fonte: z.enum(["contato", "atendimento", "card", "utm"]), campo: z.string().min(1).max(200) });
export const cartaoSchema = z.object({
  id: z.string().min(1).max(60),
  titulo: z.string().trim().min(1).max(80),
  tipo: z.enum(TIPOS_GRAFICO),
  fonte: z.enum(["contato", "atendimento", "card", "utm"]),
  medida: z.enum(MEDIDAS).default("contagem"),
  campoMedida: ref.nullable().optional(),
  indicador: z.string().max(60).nullable().optional(),
  dimensao: ref.nullable().optional(),
  serie: ref.nullable().optional(),
  granularidade: z.enum(["dia", "semana", "mes"]).default("dia"),
  ordem: z.enum(["valor_desc", "valor_asc", "rotulo"]).default("valor_desc"),
  topN: z.number().int().min(1).max(100).nullable().optional(),
  comparar: z.boolean().default(false),
  formato: z.enum(["numero", "percentual", "moeda"]).default("numero"),
  tamanho: z.enum(["metade", "inteiro"]).default("metade"),
  filtros: z.array(filtroCampoSchema).max(20).default([]),
});
export type CartaoGrafico = z.infer<typeof cartaoSchema>;
export type CampoRef = z.infer<typeof ref>;

export const cartoesValidos = (v: unknown): CartaoGrafico[] =>
  (Array.isArray(v) ? v : []).map((c) => cartaoSchema.safeParse(c)).filter((r) => r.success).map((r) => r.data!);

export const novoCartao = (id: string): CartaoGrafico => cartaoSchema.parse({ id, titulo: "Novo gráfico", tipo: "barras", fonte: "contato", dimensao: { fonte: "contato", campo: "origem" } });

const GEO = /(^|\.|\b)(estado|uf|cidade|municipio|município|regiao|região|pais|país)\b/i;
export const campoGeo = (c: Pick<CampoCatalogo, "campo" | "nome" | "rotulo">) => GEO.test(c.campo) || GEO.test(c.nome) || GEO.test(c.rotulo);

/** Fontes que o cliente tem (grupo com algum campo preenchido). Cliente sem cards não vê "Card". */
export function fontesDisponiveis(cat: GrupoCatalogo[]): FonteCampo[] {
  return cat.filter((g) => g.campos.some((c) => !c.oculto && c.preenchidos > 0)).map((g) => g.fonte);
}

/** Tipos que fazem sentido para a configuração e os dados do cliente; o resto não aparece. */
export function tiposDisponiveis(cat: GrupoCatalogo[], cfg: Pick<CartaoGrafico, "dimensao" | "medida">): TipoGrafico[] {
  const campo = cfg.dimensao ? cat.find((g) => g.fonte === cfg.dimensao!.fonte)?.campos.find((c) => c.campo === cfg.dimensao!.campo) : undefined;
  const ehData = campo?.tipo === "data" || cfg.dimensao?.campo === "criado_em" || cfg.medida === "indicador";
  const temGeo = cat.some((g) => g.campos.some((c) => !c.oculto && c.preenchidos > 0 && campoGeo(c)));
  const out: TipoGrafico[] = ["numero", "tabela"];
  if (cfg.dimensao || cfg.medida === "indicador") out.push("barras", "barras_empilhadas");
  if (ehData) out.push("linhas", "area");
  if (cfg.dimensao && !ehData) out.push("pizza", "rosca", "funil");
  if (temGeo && campo && campoGeo(campo)) out.push("mapa");
  return TIPOS_GRAFICO.filter((t) => out.includes(t));
}

/* ---------------- agregação ---------------- */

const textos = (v: unknown): string[] => {
  const l = Array.isArray(v) ? v : [v];
  const t = l.filter(preenchidoCampo).map((x) => (x && typeof x === "object" ? String((x as any).name ?? (x as any).value ?? "") : String(x))).filter((s) => s.trim());
  return t.length ? t : [NAO_DEFINIDO];
};
const numero = (v: unknown): number | null => {
  const x = Array.isArray(v) ? v[0] : v;
  if (x == null || x === "") return null;
  const n = typeof x === "number" ? x : Number(String(x).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

/** Agrupa um dia ISO (YYYY-MM-DD) pela granularidade. Semana começa na segunda. */
export function balde(dia: string, g: "dia" | "semana" | "mes"): string {
  if (g === "dia") return dia;
  if (g === "mes") return dia.slice(0, 7);
  const d = new Date(`${dia}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

const ehCampoData = (f: CampoRef | null | undefined, cat?: GrupoCatalogo[]) =>
  !!f && (f.campo === "criado_em" || cat?.find((g) => g.fonte === f.fonte)?.campos.find((c) => c.campo === f.campo)?.tipo === "data");

function registros(base: BaseCampos, fonte: FonteCampo): any[] {
  return fonte === "atendimento" ? base.atendimentos : fonte === "card" ? base.cards : base.contatos;
}
const contatoDe = (fonte: FonteCampo, r: any): string[] => (fonte === "atendimento" ? (r.contato_id ? [r.contato_id] : []) : fonte === "card" ? (r.contato_ids ?? []) : [r.id]);

/** Liga o registro da fonte do cartão a um campo de outra fonte, sempre pelo contato (sem juntar linhas). */
function valorLigado(base: BaseCampos, fonte: FonteCampo, f: CampoRef, r: any, idx: Indices): unknown {
  const mesma = f.fonte === fonte || (f.fonte === "utm" && fonte === "contato") || (f.fonte === "contato" && fonte === "utm");
  if (mesma) return valorDe(f.fonte, f.campo, r);
  const cid = contatoDe(fonte, r)[0];
  if (!cid) return null;
  if (f.fonte === "contato" || f.fonte === "utm") return valorDe(f.fonte, f.campo, idx.contato.get(cid));
  if (f.fonte === "atendimento") return valorDe("atendimento", f.campo, idx.atendimento.get(cid));
  return valorDe("card", f.campo, idx.card.get(cid));
}
type Indices = { contato: Map<string, any>; atendimento: Map<string, any>; card: Map<string, any> };
function indices(base: BaseCampos): Indices {
  const primeiro = <T,>(l: T[], k: (x: T) => string[]) => {
    const m = new Map<string, T>();
    for (const x of l) for (const id of k(x)) if (!m.has(id)) m.set(id, x);
    return m;
  };
  return {
    contato: new Map(base.contatos.map((c) => [c.id, c])),
    atendimento: primeiro(base.atendimentos, (a) => (a.contato_id ? [a.contato_id] : [])),
    card: primeiro(base.cards, (c) => c.contato_ids ?? []),
  };
}

export type ResultadoCartao = {
  categorias: { rotulo: string; valores: Record<string, number>; total: number }[];
  series: string[];
  total: number;
  anterior: number | null;
  estimados: string[];
  linhas: number;
};

type Acc = { n: number; soma: number; qtd: number; ids: Set<string> };
const acc = (): Acc => ({ n: 0, soma: 0, qtd: 0, ids: new Set() });
function valorAcc(a: Acc, m: Medida): number {
  if (m === "distinta") return a.ids.size;
  if (m === "soma") return a.soma;
  if (m === "media" || m === "tempo_medio") return a.qtd ? a.soma / a.qtd : 0;
  return a.n;
}

/** Agregação de um cartão (medidas sobre registros). Indicador da Matriz é tratado no servidor. */
export function agregarCartao(base: BaseCampos, cfg: CartaoGrafico, p: Periodo, filtrosVisao: FiltroCampo[] = [], cat?: GrupoCatalogo[]): ResultadoCartao {
  const idx = indices(base);
  const filtro = aplicarFiltrosCampos(base, [...filtrosVisao, ...cfg.filtros]);
  const regsFonte = registros(base, cfg.fonte).filter((r) => {
    if (!filtro) return true;
    if (cfg.fonte === "card") return filtro.cards.has(r.id);
    return contatoDe(cfg.fonte, r).some((id) => filtro.contatos.has(id));
  });
  const noPeriodo = (r: any, per: Periodo) => {
    const d = diaSP(r.criado_em);
    return !!d && d >= per.de && d <= per.ate;
  };
  const chaveDe = (f: CampoRef | null | undefined, r: any): string[] => {
    if (!f) return ["Total"];
    if (ehCampoData(f, cat)) {
      const v = f.campo === "criado_em" ? r.criado_em : valorLigado(base, cfg.fonte, f, r, idx);
      const d = diaSP(Array.isArray(v) ? (v[0] as string) : (v as string));
      return [d ? balde(d, cfg.granularidade) : NAO_DEFINIDO];
    }
    return textos(valorLigado(base, cfg.fonte, f, r, idx));
  };
  const medir = (a: Acc, r: any) => {
    a.n += 1;
    for (const id of contatoDe(cfg.fonte, r)) a.ids.add(id);
    if (cfg.medida === "soma" || cfg.medida === "media" || cfg.medida === "tempo_medio") {
      const n = cfg.campoMedida ? numero(valorLigado(base, cfg.fonte, cfg.campoMedida, r, idx)) : null;
      if (n != null) { a.soma += n; a.qtd += 1; }
    }
  };
  const grupos = new Map<string, Map<string, Acc>>();
  const geral = acc();
  const atuais = regsFonte.filter((r) => noPeriodo(r, p));
  for (const r of atuais) {
    medir(geral, r);
    for (const k of chaveDe(cfg.dimensao, r)) {
      const g = grupos.get(k) ?? new Map<string, Acc>();
      for (const s of cfg.serie ? chaveDe(cfg.serie, r) : ["Valor"]) {
        const a = g.get(s) ?? acc();
        medir(a, r);
        g.set(s, a);
      }
      grupos.set(k, g);
    }
  }
  let anterior: number | null = null;
  if (cfg.comparar) {
    const a = acc();
    for (const r of regsFonte) if (noPeriodo(r, periodoAnterior(p))) medir(a, r);
    anterior = valorAcc(a, cfg.medida);
  }
  const series = [...new Set([...grupos.values()].flatMap((g) => [...g.keys()]))];
  let categorias = [...grupos.entries()].map(([rotulo, g]) => {
    const valores: Record<string, number> = {};
    for (const s of series) valores[s] = g.get(s) ? valorAcc(g.get(s)!, cfg.medida) : 0;
    return { rotulo, valores, total: Object.values(valores).reduce((x, y) => x + y, 0) };
  });
  return { ...finalizar(categorias, series, cfg, ehCampoData(cfg.dimensao, cat)), total: valorAcc(geral, cfg.medida), anterior, estimados: [], linhas: atuais.length };
}

/** Ordena, aplica Top N com "Outros" (somente medidas somáveis). Datas ficam em ordem cronológica. */
export function finalizar(categorias: ResultadoCartao["categorias"], series: string[], cfg: Pick<CartaoGrafico, "ordem" | "topN" | "medida">, cronologico: boolean) {
  let c = [...categorias];
  if (cronologico) c.sort((a, b) => (a.rotulo === NAO_DEFINIDO ? 1 : b.rotulo === NAO_DEFINIDO ? -1 : a.rotulo.localeCompare(b.rotulo)));
  else if (cfg.ordem === "rotulo") c.sort((a, b) => a.rotulo.localeCompare(b.rotulo));
  else c.sort((a, b) => (cfg.ordem === "valor_asc" ? a.total - b.total : b.total - a.total));
  const somavel = cfg.medida === "contagem" || cfg.medida === "soma" || cfg.medida === "indicador";
  if (!cronologico && cfg.topN && c.length > cfg.topN) {
    const resto = c.slice(cfg.topN);
    c = c.slice(0, cfg.topN);
    if (somavel) {
      const valores: Record<string, number> = {};
      for (const s of series) valores[s] = resto.reduce((a, x) => a + (x.valores[s] ?? 0), 0);
      c.push({ rotulo: "Outros", valores, total: resto.reduce((a, x) => a + x.total, 0) });
    }
  }
  return { categorias: c, series };
}

/** Indicador da Matriz por dia → cartão (mesmo número da Matriz; estimados marcados e fora do total sem marca). */
export function cartaoDeIndicador(
  linhas: { dia: string; celulas: Record<string, { valor: number | null; estimado?: boolean } | undefined> }[],
  chave: string,
  cfg: CartaoGrafico,
  anteriorTotal: number | null,
): ResultadoCartao {
  const por = new Map<string, number>();
  const estimados: string[] = [];
  let total = 0;
  for (const l of linhas) {
    const c = l.celulas[chave];
    const v = Number(c?.valor ?? 0);
    if (c?.estimado) { estimados.push(l.dia); continue; }
    total += v;
    const k = balde(l.dia, cfg.granularidade);
    por.set(k, (por.get(k) ?? 0) + v);
  }
  const categorias = [...por.entries()].map(([rotulo, v]) => ({ rotulo, valores: { Valor: v }, total: v }));
  return { ...finalizar(categorias, ["Valor"], cfg, true), total, anterior: anteriorTotal, estimados, linhas: linhas.length };
}

/** Cartões com dinheiro (moeda ou soma/média de valor) não vão a parceiro sem permissão de valores. */
export const cartaoTemDinheiro = (c: CartaoGrafico) =>
  c.formato === "moeda" || ((c.medida === "soma" || c.medida === "media") && /valor|preco|preço|monetar/i.test(c.campoMedida?.campo ?? ""));
