/**
 * Construtor de gráficos (Fase 4): configuração de cartão e agregação pura.
 * Lê só o catálogo Campos do Elora (rótulos/ocultos) e a base de campos;
 * nada específico de cliente. Valor ausente = "Não definido".
 */
import { z } from "zod";
import { aplicarFiltrosCampos, filtroCampoSchema, preenchidoCampo, valorDe, type BaseCampos, type CampoCatalogo, type FiltroCampo, type FonteCampo, type GrupoCatalogo } from "./campos-elora";
import { NAO_DEFINIDO } from "./nao-definido";
import { diaSP, formatarDuracao, periodoAnterior, type Periodo } from "./painel-visual";

export const TIPOS_GRAFICO = ["numero", "barras", "barras_empilhadas", "linhas", "area", "pizza", "rosca", "funil", "tabela", "mapa", "calendario", "dois_valores", "matriz_utm", "tabela_itens"] as const;
export type TipoGrafico = (typeof TIPOS_GRAFICO)[number];
export const ROTULO_TIPO_GRAFICO: Record<TipoGrafico, string> = {
  numero: "Número grande", barras: "Barras", barras_empilhadas: "Barras empilhadas", linhas: "Linhas", area: "Área",
  pizza: "Pizza", rosca: "Rosca", funil: "Funil", tabela: "Tabela", mapa: "Mapa", calendario: "Calendário",
  dois_valores: "Dois valores", matriz_utm: "Matriz por UTM", tabela_itens: "Tabela de itens",
};
export const MEDIDAS = ["contagem", "distinta", "soma", "media", "tempo_medio", "indicador"] as const;
export type Medida = (typeof MEDIDAS)[number];
export const ROTULO_MEDIDA: Record<Medida, string> = {
  contagem: "Contagem", distinta: "Contagem distinta (contatos)", soma: "Soma", media: "Média", tempo_medio: "Tempo médio", indicador: "Indicador da Matriz",
};

const ref = z.object({ fonte: z.enum(["contato", "atendimento", "card", "utm"]), campo: z.string().min(1).max(200) });
const painelEnum = z.enum(["kpi-leads", "kpi-conversas", "kpi-tmr", "kpi-tma", "kpi-ads", "leads-dia", "leads-por", "conversas-dia", "campanhas", "canais", "atendentes"]);
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
  /** Layout na grade de 12 colunas (ausente = padrão do tipo). */
  largura: z.number().int().min(1).max(12).optional(),
  altura: z.number().int().min(1).max(12).optional(),
  /** Calendário: visualização inicial e campos extras na lista do dia. */
  visualCalendario: z.enum(["mes", "semana", "agenda"]).default("mes"),
  camposLista: z.array(ref).max(8).default([]),
  painel: painelEnum.optional(),
  filtros: z.array(filtroCampoSchema).max(20).default([]),
  /** Funil: "ranking" (% do total) ou "etapas" (conversão entre uma faixa e a seguinte). */
  modoFunil: z.enum(["ranking", "etapas"]).default("ranking"),
  /** Até 3 medidas que quem vê alterna no próprio bloco (não grava nada). */
  medidasAlternaveis: z.array(z.object({
    rotulo: z.string().trim().min(1).max(40),
    fonte: z.enum(["contato", "atendimento", "card", "utm"]),
    medida: z.enum(MEDIDAS).default("contagem"),
    campoMedida: ref.nullable().optional(),
    serie: ref.nullable().optional(),
    /** Bloco padrão do painel (mesma regra), quando a alternativa é um deles. */
    painel: painelEnum.optional(),
  })).max(3).default([]),
  /** Calendário: outros campos de data que quem vê alterna (o principal é `dimensao`). */
  camposData: z.array(ref).max(4).default([]),
  /** Matriz por UTM: campos de UTM que agrupam as linhas e "só patrocinados". */
  agrupar: z.array(ref).max(8).default([]),
  soPatrocinados: z.boolean().default(false),
  /** Tabela de itens: colunas do catálogo (a coluna "Origem" calculada é sempre incluída). */
  colunas: z.array(ref.extend({ rotulo: z.string().trim().max(60).optional() })).max(24).default([]),
  /** Tabela de itens de cards: só os cards contados por estes indicadores da Matriz no período (mesma regra da Matriz). */
  indicadoresItens: z.array(z.string().min(1).max(80)).max(6).default([]),
});
export type CartaoGrafico = z.infer<typeof cartaoSchema>;
export type CampoRef = z.infer<typeof ref>;

export const cartoesValidos = (v: unknown): CartaoGrafico[] =>
  (Array.isArray(v) ? v : []).flatMap((c) => { const r = cartaoSchema.safeParse(c); return r.success ? [r.data] : []; });

/** Título padrão por tipo; só troca enquanto o título ainda for um padrão (nunca apaga o que foi digitado). */
export const TITULO_PADRAO = { calendario: "Agendamentos", outro: "Novo gráfico" } as const;
export const tituloPadrao = (tipo: string) => (tipo === "calendario" ? TITULO_PADRAO.calendario : TITULO_PADRAO.outro);
export const ehTituloPadrao = (t: string) => Object.values(TITULO_PADRAO).includes(t as any);

/** Funil: as N maiores etapas e o resto somado em "Outras" (a soma total não muda). */
export function funilTop<T extends { rotulo: string; total: number }>(lista: T[], n = 8): { rotulo: string; total: number }[] {
  const ord = [...lista].sort((a, b) => b.total - a.total);
  if (ord.length <= n) return ord.map(({ rotulo, total }) => ({ rotulo, total }));
  const resto = ord.slice(n).reduce((a, b) => a + b.total, 0);
  return [...ord.slice(0, n).map(({ rotulo, total }) => ({ rotulo, total })), { rotulo: "Outras", total: resto }];
}

export const novoCartao = (id: string): CartaoGrafico => cartaoSchema.parse({ id, titulo: TITULO_PADRAO.outro, tipo: "barras", fonte: "contato", dimensao: { fonte: "contato", campo: "origem" } });

/** Indicadores do cabeçalho como cartões (mesma agregação do painel). */
export const CARTOES_KPI = [
  ["kpi-leads", "Novos leads", "contagem", "contato"],
  ["kpi-conversas", "Conversas realizadas", "contagem", "atendimento"],
  ["kpi-tmr", "TMR", "tempo_medio", "atendimento"],
  ["kpi-ads", "Leads de ADS", "contagem", "contato"],
  ["kpi-tma", "TMA", "tempo_medio", "atendimento"],
].map(([id, titulo, medida, fonte]) => cartaoSchema.parse({ id, titulo, tipo: "numero", medida, fonte, painel: id, comparar: true, largura: 3, altura: 1 }));
export const ehCartaoKpi = (c: Pick<CartaoGrafico, "painel">) => !!c.painel && c.painel.startsWith("kpi-");

/** Cartões padrão: mesma agregação autorizada do painel, sem uma segunda regra. */
export const CARTOES_PAINEL = [
  ["leads-dia", "Leads por dia", "barras_empilhadas", "contato", "criado_em"],
  ["leads-por", "Leads por", "rosca", "contato", "origem"],
  ["conversas-dia", "Conversas por dia", "barras_empilhadas", "atendimento", "criado_em"],
  ["campanhas", "Principais campanhas", "barras", "utm", "campaign"],
  ["canais", "Atendimentos por canal", "barras", "atendimento", "canal"],
  ["atendentes", "Conversas por atendente", "tabela", "atendimento", "atendente"],
].map(([id, titulo, tipo, fonte, campo]) => cartaoSchema.parse({ id, titulo, tipo, fonte, painel: id, dimensao: { fonte, campo } }));

export function cartaoDoPainel(r: import("./painel-visual").ResumoPainel, c: CartaoGrafico): ResultadoCartao {
  const categoria = (rotulo: string, valores: Record<string, number>) => ({ rotulo, valores, total: Object.values(valores).reduce((a,b) => a+b,0) });
  let categorias: ResultadoCartao["categorias"] = [];
  let series = ["Valor"];
  let total: number | undefined;
  const nf = (v: number) => v.toLocaleString("pt-BR");
  const { atual: a, anterior: ant } = r.kpis;
  const kpi = (total: number, anterior: number | null, rodape?: string): ResultadoCartao => ({ categorias: [], series: ["Valor"], total, anterior, estimados: [], linhas: 0, rodape });
  switch (c.painel) {
    case "kpi-leads": return kpi(a.novosLeads, ant.novosLeads, a.importadosFora ? `${nf(a.importadosFora)} importados fora da conta` : undefined);
    case "kpi-conversas": return kpi(a.conversas, ant.conversas);
    case "kpi-tmr": return kpi(a.tmr.valor ?? Number.NaN, ant.tmr.valor ?? null, `${nf(a.tmr.medidas)} conversas medidas`);
    case "kpi-tma": return kpi(a.tma.valor ?? Number.NaN, ant.tma.valor ?? null, `${nf(a.tma.medidas)} conversas medidas`);
    case "kpi-ads": return kpi(a.leadsAds, ant.leadsAds, `${(a.novosLeads ? (a.leadsAds / a.novosLeads) * 100 : 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% dos novos leads`);
    case "leads-dia": series = ["Sem campanha", "Vindos de ADS"]; categorias = r.porDia.map(d => categoria(d.dia, { "Sem campanha": d.organicos, "Vindos de ADS": d.ads })); break;
    case "conversas-dia": series = ["Usuário do sistema", "Bot"]; categorias = r.porDia.map(d => categoria(d.dia, { "Usuário do sistema": d.usuario, Bot: d.bot })); break;
    case "leads-por": {
      const dim = c.dimensao?.campo === "canal" ? "canal" : c.dimensao?.campo === "etiquetas" ? "etiqueta" : c.dimensao?.campo === "campaign" ? "campanha" : "origem";
      const todos = r.leadsPor[dim];
      const fatias = todos.length > 5 ? [...todos.slice(0,4), { nome: "Outros", valor: todos.slice(4).reduce((a,b)=>a+b.valor,0) }] : todos;
      categorias = fatias.map(d => categoria(d.nome, { Valor: d.valor }));
      total = dim === "etiqueta" ? r.kpis.atual.novosLeads : todos.reduce((a,b)=>a+b.valor,0); break;
    }
    case "campanhas": categorias = r.campanhas.map(d => categoria(d.nome, { Valor: d.valor })); break;
    case "canais": categorias = r.canais.map(d => categoria(d.nome, { Valor: d.valor })); break;
    case "atendentes":
      series = ["Atendimentos", "Conversas", "Proporção (%)"];
      total = r.atendentes.reduce((a,b)=>a+b.conversas,0);
      categorias = r.atendentes.map(d => ({ rotulo: d.nome, valores: { Atendimentos: d.atendimentos, Conversas: d.conversas, "Proporção (%)": total ? d.conversas / total * 100 : 0 }, total: d.conversas })); break;
  }
  return { categorias, series, total: total ?? categorias.reduce((a,b)=>a+b.total,0), anterior: null, estimados: [], linhas: categorias.length };
}

const GEO = /(^|\.|\b)(estado|uf|cidade|municipio|município|regiao|região|pais|país)\b/i;
export const campoGeo = (c: Pick<CampoCatalogo, "campo" | "nome" | "rotulo">) => GEO.test(c.campo) || GEO.test(c.nome) || GEO.test(c.rotulo);

/** Fontes que o cliente tem (grupo com algum campo preenchido). Cliente sem cards não vê "Card". */
export function fontesDisponiveis(cat: GrupoCatalogo[]): FonteCampo[] {
  return cat.filter((g) => g.campos.some((c) => !c.oculto && c.preenchidos > 0)).map((g) => g.fonte);
}

/** Cliente com algum campo de data preenchido e visível no catálogo. */
export const temCampoData = (cat: GrupoCatalogo[]) => cat.some((g) => g.campos.some((c) => !c.oculto && c.preenchidos > 0 && c.tipo === "data"));

/** Tipos que fazem sentido para a configuração e os dados do cliente; o resto não aparece. */
export function tiposDisponiveis(cat: GrupoCatalogo[], cfg: Pick<CartaoGrafico, "dimensao" | "medida">): TipoGrafico[] {
  const dim = cfg.dimensao;
  const campo = dim ? cat.find((g) => g.fonte === dim.fonte)?.campos.find((c) => c.campo === dim.campo) : undefined;
  const ehData = campo?.tipo === "data" || cfg.dimensao?.campo === "criado_em" || cfg.medida === "indicador";
  const temGeo = cat.some((g) => g.campos.some((c) => !c.oculto && c.preenchidos > 0 && campoGeo(c)));
  const out: TipoGrafico[] = ["numero", "tabela"];
  if (cfg.dimensao || cfg.medida === "indicador") out.push("barras", "barras_empilhadas");
  if (ehData) out.push("linhas", "area");
  if (cfg.dimensao && !ehData) out.push("pizza", "rosca", "funil");
  if (temGeo && campo && campoGeo(campo)) out.push("mapa");
  if (temCampoData(cat)) out.push("calendario");
  const comDado = (f: (c: CampoCatalogo, fonte: FonteCampo) => boolean) => cat.some((g) => g.campos.some((c) => !c.oculto && c.preenchidos > 0 && f(c, g.fonte)));
  if (comDado((c) => c.tipo === "numero" || c.tipo === "moeda")) out.push("dois_valores");
  if (comDado((_c, f) => f === "utm")) out.push("matriz_utm");
  if (comDado((_c, f) => f === "contato" || f === "card")) out.push("tabela_itens");
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
  rodape?: string;
  /** Calendário: dias sem sincronização confirmada e com zero (mostrar "aguardando"). */
  aguardando?: string[];
  cobertura?: string;
  primeiraLeitura?: string | null;
  /** Dois valores: a quantidade ao lado da soma. */
  qtd?: number;
  qtdAnterior?: number | null;
  /** Quantos da quantidade vêm de leitura estimada (contam, sempre marcados). */
  qtdEstimados?: number;
  /** Tabela de itens: colunas e linhas já formatadas (sem texto de mensagem). */
  colunasItens?: { chave: string; rotulo: string }[];
  itens?: { id: string; valores: Record<string, string> }[];
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
    for (const s of series) { const a = g.get(s); valores[s] = a ? valorAcc(a, cfg.medida) : 0; }
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
  c.formato === "moeda" || (c.tipo === "dois_valores" && /valor|preco|preço|monetar/i.test(c.campoMedida?.campo ?? "")) || ((c.medida === "soma" || c.medida === "media") && /valor|preco|preço|monetar/i.test(c.campoMedida?.campo ?? ""));

/* ---------------- calendário ---------------- */

/** Dia (America/Sao_Paulo) do campo de data escolhido para o registro. */
function diaDoCampo(base: BaseCampos, fonte: FonteCampo, f: CampoRef, r: any, idx: Indices): string | null {
  const v = f.campo === "criado_em" && (f.fonte === fonte || (f.fonte === "utm" && fonte === "contato")) ? r.criado_em : valorLigado(base, fonte, f, r, idx);
  const x = Array.isArray(v) ? v[0] : v;
  if (x == null || x === "") return null;
  const s = String(x);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : diaSP(s);
}

function registrosCalendario(base: BaseCampos, cfg: CartaoGrafico, filtrosVisao: FiltroCampo[]) {
  const filtro = aplicarFiltrosCampos(base, [...filtrosVisao, ...cfg.filtros]);
  return registros(base, cfg.fonte).filter((r) => {
    if (!filtro) return true;
    if (cfg.fonte === "card") return filtro.cards.has(r.id);
    return contatoDe(cfg.fonte, r).some((id) => filtro.contatos.has(id));
  });
}

/** Calendário: agrupa pelo dia do campo de data escolhido (não pela criação). */
export function agregarCalendario(base: BaseCampos, cfg: CartaoGrafico, p: Periodo, filtrosVisao: FiltroCampo[] = []): ResultadoCartao {
  if (!cfg.dimensao) return { categorias: [], series: ["Valor"], total: 0, anterior: null, estimados: [], linhas: 0 };
  const idx = indices(base);
  const por = new Map<string, Acc>();
  const geral = acc();
  let linhas = 0;
  for (const r of registrosCalendario(base, cfg, filtrosVisao)) {
    const d = diaDoCampo(base, cfg.fonte, cfg.dimensao, r, idx);
    if (!d || d < p.de || d > p.ate) continue;
    linhas += 1;
    const a = por.get(d) ?? acc();
    for (const x of [a, geral]) {
      x.n += 1;
      for (const id of contatoDe(cfg.fonte, r)) x.ids.add(id);
      if (cfg.medida === "soma" || cfg.medida === "media") {
        const n = cfg.campoMedida ? numero(valorLigado(base, cfg.fonte, cfg.campoMedida, r, idx)) : null;
        if (n != null) { x.soma += n; x.qtd += 1; }
      }
    }
    por.set(d, a);
  }
  const categorias = [...por.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([rotulo, a]) => { const v = valorAcc(a, cfg.medida); return { rotulo, valores: { Valor: v }, total: v }; });
  return { categorias, series: ["Valor"], total: valorAcc(geral, cfg.medida), anterior: null, estimados: [], linhas };
}

/** Dias do período com zero e sem cobertura confirmada: "aguardando", nunca zero. */
export function diasAguardando(p: Periodo, r: Pick<ResultadoCartao, "categorias" | "estimados">, estadoDoDia: (dia: string) => string, hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })): string[] {
  const com = new Set(r.categorias.filter((c) => c.total !== 0).map((c) => c.rotulo));
  const est = new Set(r.estimados);
  const out: string[] = [];
  for (let d = new Date(`${p.de}T12:00:00Z`); d.toISOString().slice(0, 10) <= p.ate; d.setUTCDate(d.getUTCDate() + 1)) {
    const dia = d.toISOString().slice(0, 10);
    if (dia > hoje) break; // dia futuro fica vazio, nunca "aguardando"
    if (!com.has(dia) && !est.has(dia) && estadoDoDia(dia) !== "confirmado") out.push(dia);
  }
  return out;
}

export type ItemDia = { id: string; nome: string; telefone: string; atendente: string; valor: number | null; campos: Record<string, string> };
const DINHEIRO = /valor|preco|preço|monetar|moeda|receita|faturamento|ticket/i;

/** Itens de um dia do calendário. Sem texto de mensagem; dinheiro some para quem não vê valores. */
export function itensDoDia(base: BaseCampos, cfg: CartaoGrafico, dia: string, filtrosVisao: FiltroCampo[], semDinheiro: boolean, limite = 200): ItemDia[] {
  if (!cfg.dimensao) return [];
  const idx = indices(base);
  const out: ItemDia[] = [];
  const txt = (v: unknown) => { const t = textos(v); return t[0] === NAO_DEFINIDO ? NAO_DEFINIDO : t.join(", "); };
  for (const r of registrosCalendario(base, cfg, filtrosVisao)) {
    if (diaDoCampo(base, cfg.fonte, cfg.dimensao, r, idx) !== dia) continue;
    const cid = contatoDe(cfg.fonte, r)[0];
    const contato = cid ? idx.contato.get(cid) : undefined;
    const sessao = cfg.fonte === "atendimento" ? r : cid ? idx.atendimento.get(cid) : undefined;
    const campos: Record<string, string> = {};
    for (const f of cfg.camposLista) {
      if (semDinheiro && DINHEIRO.test(f.campo)) continue;
      campos[`${f.fonte}|${f.campo}`] = txt(valorLigado(base, cfg.fonte, f, r, idx));
    }
    const valorBruto = cfg.campoMedida ? numero(valorLigado(base, cfg.fonte, cfg.campoMedida, r, idx)) : null;
    const dinheiroMedida = cfg.formato === "moeda" || DINHEIRO.test(cfg.campoMedida?.campo ?? "");
    out.push({
      id: String(r.id ?? out.length),
      nome: txt(contato?.nome ?? r.nome ?? r.titulo),
      telefone: txt(contato?.telefone),
      atendente: txt(sessao ? valorDe("atendimento", "atendente", sessao) : null),
      valor: semDinheiro && dinheiroMedida ? null : valorBruto,
      campos,
    });
    if (out.length >= limite) break;
  }
  return out;
}

/**
 * Migração dos indicadores: visão sem nenhum `kpi-*` recebe os 5 blocos no topo (3 colunas cada; o 5º desce de linha);
 * visão com o antigo "TMR · TMA" passa a ter "TMR" e um bloco "TMA" logo depois dos indicadores. Nenhum bloco é removido.
 */
export function migrarKpisVisao(cartoes: CartaoGrafico[]): CartaoGrafico[] {
  const temKpi = cartoes.some(ehCartaoKpi);
  if (!temKpi) return [...CARTOES_KPI.map((c) => ({ ...c })), ...cartoes];
  const out = cartoes.map((c) => (c.painel === "kpi-tmr" && c.titulo === "TMR · TMA" ? { ...c, titulo: "TMR" } : c));
  if (!out.some((c) => c.painel === "kpi-tma")) {
    const ultimo = out.reduce((i, c, k) => (ehCartaoKpi(c) ? k : i), -1);
    out.splice(ultimo + 1, 0, { ...CARTOES_KPI.find((c) => c.painel === "kpi-tma")! });
  }
  return out;
}


/* ---------------- Fase 7: tipos novos (genéricos) ---------------- */

/** Aplica uma medida alternável ao bloco só na tela de quem vê (devolve cópia; nunca grava). */
export function aplicarAlternativa(cfg: CartaoGrafico, i: number): CartaoGrafico {
  const a = cfg.medidasAlternaveis[i];
  if (!a) return cfg;
  return { ...cfg, fonte: a.fonte, medida: a.medida, campoMedida: a.campoMedida ?? null, serie: a.serie ?? null, painel: a.painel };
}

/** Origem calculada pela mesma regra de ADS do motor: contato com campanha = patrocinado. */
export function origemCalculada(c: Pick<import("./campos-elora").ContatoBase, "utm_campaign" | "origem"> | undefined | null): string {
  if (!c) return NAO_DEFINIDO;
  if (c.utm_campaign) return "Patrocinado";
  if (!c.origem) return NAO_DEFINIDO;
  return c.origem.toUpperCase() === "IMPORTED" ? "Outro" : "Orgânico";
}

/** Dois valores: soma do campo escolhido e quantidade de registros, com comparação opcional. */
export function agregarDoisValores(base: BaseCampos, cfg: CartaoGrafico, p: Periodo, filtrosVisao: FiltroCampo[] = [], cat?: GrupoCatalogo[]): ResultadoCartao {
  const sem = { dimensao: null, serie: null };
  const s = agregarCartao(base, { ...cfg, ...sem, medida: "soma" }, p, filtrosVisao, cat);
  const q = agregarCartao(base, { ...cfg, ...sem, medida: "contagem" }, p, filtrosVisao, cat);
  return { ...s, categorias: [], qtd: q.total, qtdAnterior: q.anterior };
}

const ehImportado = (c: { origem?: string | null }) => (c.origem ?? "").toUpperCase() === "IMPORTED";
const noPer = (iso: string | null | undefined, p: Periodo) => { const d = diaSP(iso ?? null); return !!d && d >= p.de && d <= p.ate; };

/**
 * Matriz por UTM: linhas = combinação dos campos de UTM escolhidos (do contato).
 * Novas conversas = atendimentos criados no período, pela UTM do contato; novos contatos = contatos criados no período
 * (importados fora, como em Novos leads). A soma das linhas é sempre o total.
 */
export function agregarMatrizUtm(base: BaseCampos, cfg: CartaoGrafico, p: Periodo, filtrosVisao: FiltroCampo[] = []): ResultadoCartao {
  const filtro = aplicarFiltrosCampos(base, [...filtrosVisao, ...cfg.filtros]);
  const ok = (id: string | null) => !!id && (!filtro || filtro.contatos.has(id));
  const idx = new Map(base.contatos.map((c) => [c.id, c]));
  const campos = cfg.agrupar.length ? cfg.agrupar : [{ fonte: "utm" as const, campo: "campaign" }];
  const chave = (c: any) => campos.map((f) => textos(valorDe("utm", f.campo, c)).join(", ")).join(" · ");
  const patrocinado = (c: any) => !!c?.utm_campaign;
  const g = new Map<string, { conv: number; cont: number }>();
  const add = (k: string, campo: "conv" | "cont") => { const x = g.get(k) ?? { conv: 0, cont: 0 }; x[campo] += 1; g.set(k, x); };
  for (const a of base.atendimentos) {
    if (!noPer(a.criado_em, p) || (filtro && !ok(a.contato_id))) continue;
    const c = a.contato_id ? idx.get(a.contato_id) : undefined;
    if (cfg.soPatrocinados && !patrocinado(c)) continue;
    add(c ? chave(c) : campos.map(() => NAO_DEFINIDO).join(" · "), "conv");
  }
  for (const c of base.contatos) {
    if (!noPer(c.criado_em, p) || ehImportado(c) || (filtro && !ok(c.id))) continue;
    if (cfg.soPatrocinados && !patrocinado(c)) continue;
    add(chave(c), "cont");
  }
  const totConv = [...g.values()].reduce((a, b) => a + b.conv, 0);
  const totCont = [...g.values()].reduce((a, b) => a + b.cont, 0);
  const series = ["Novas conversas", "Novos contatos", "% do total"];
  const categorias = [...g.entries()]
    .map(([rotulo, x]) => ({ rotulo, valores: { "Novas conversas": x.conv, "Novos contatos": x.cont, "% do total": totCont ? (x.cont / totCont) * 100 : 0 }, total: x.conv }))
    .sort((a, b) => b.total - a.total);
  return { categorias, series, total: totConv, anterior: null, estimados: [], linhas: categorias.length, rodape: `${totCont.toLocaleString("pt-BR")} novos contatos no período` };
}

/** Tabela de itens: uma linha por contato ou card criado no período, com as colunas do catálogo e a "Origem" calculada. */
export function itensTabela(base: BaseCampos, cfg: CartaoGrafico, p: Periodo, filtrosVisao: FiltroCampo[], semDinheiro: boolean, cat?: GrupoCatalogo[], limite = 2000, soCards?: Set<string>): ResultadoCartao {
  const idx = indices(base);
  const fonte: FonteCampo = cfg.fonte === "card" ? "card" : "contato";
  const filtro = aplicarFiltrosCampos(base, [...filtrosVisao, ...cfg.filtros]);
  const ehOrigem = (f: CampoRef) => f.fonte === "contato" && f.campo === "origem";
  const rot = (f: CampoRef & { rotulo?: string }) => f.rotulo || (cat?.find((g) => g.fonte === f.fonte)?.campos.find((c) => c.campo === f.campo)?.rotulo ?? f.campo.replace(/^campo\./, ""));
  const colunas: (CampoRef & { rotulo?: string })[] = cfg.colunas.filter((f) => !(semDinheiro && (DINHEIRO.test(f.campo) || (f.fonte === "card" && f.campo === "valor"))));
  const temOrigem = colunas.some(ehOrigem);
  const colunasItens = [...colunas.map((f) => (ehOrigem(f) ? { chave: "origem_calc", rotulo: f.rotulo || "Origem" } : { chave: `${f.fonte}|${f.campo}`, rotulo: rot(f) })), ...(temOrigem ? [] : [{ chave: "origem_calc", rotulo: "Origem" }])];
  const txt = (v: unknown) => textos(v).join(", ");
  const itens: { id: string; valores: Record<string, string> }[] = [];
  for (const r of registros(base, fonte)) {
    if (soCards ? !soCards.has(String(r.id)) : !noPer(r.criado_em, p)) continue;
    if (filtro && !(fonte === "card" ? filtro.cards.has(r.id) : filtro.contatos.has(r.id))) continue;
    const valores: Record<string, string> = {};
    for (const f of colunas) if (!ehOrigem(f)) valores[`${f.fonte}|${f.campo}`] = txt(valorLigado(base, fonte, f, r, idx));
    const cid = contatoDe(fonte, r)[0];
    valores.origem_calc = origemCalculada(cid ? idx.contato.get(cid) : undefined);
    itens.push({ id: String(r.id), valores });
    if (itens.length >= limite) break;
  }
  return { categorias: [], series: [], total: itens.length, anterior: null, estimados: [], linhas: itens.length, colunasItens, itens };
}

/** Funil: % de cada faixa (ranking: sobre o total; etapas: sobre a faixa anterior). */
export function percentuaisFunil(faixas: { total: number }[], modo: "ranking" | "etapas"): (number | null)[] {
  const soma = faixas.reduce((a, b) => a + b.total, 0);
  return faixas.map((f, i) => (modo === "ranking" ? (soma ? (f.total / soma) * 100 : 0) : i === 0 ? null : faixas[i - 1].total ? (f.total / faixas[i - 1].total) * 100 : 0));
}

/** Dois valores ligado a um indicador da Matriz: quantidade = cards contados; valor = soma do campo desses mesmos cards. */
export function doisValoresDeCards(base: BaseCampos, cfg: CartaoGrafico, contados: { card_id: string; estimado: boolean }[], anteriores: number | null): ResultadoCartao {
  const cards = new Map(base.cards.map((c) => [c.id, c]));
  let soma = 0;
  for (const x of contados) { const n = cfg.campoMedida ? numero(valorDe("card", cfg.campoMedida.campo, cards.get(x.card_id))) : null; if (n != null) soma += n; }
  return { categorias: [], series: [], total: soma, anterior: null, estimados: [], linhas: contados.length, qtd: contados.length, qtdAnterior: anteriores, qtdEstimados: contados.filter((x) => x.estimado).length };
}
