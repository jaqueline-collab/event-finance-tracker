/**
 * Catálogo "Campos do Elora" e filtros genéricos (puros, testáveis).
 * Montado só com o que o cliente tem: grupo sem dado não aparece.
 * Valor ausente = "Não definido". Nada específico de cliente aqui.
 */
import { z } from "zod";
import { NAO_DEFINIDO } from "./nao-definido";

export type FonteCampo = "contato" | "atendimento" | "card" | "utm";
export type TipoCampo = "texto" | "numero" | "data" | "lista" | "simnao" | "moeda";
export type UsoCampo = "filtro" | "coluna" | "grafico";

export const FONTES_CATALOGO: { fonte: FonteCampo; nome: string }[] = [
  { fonte: "contato", nome: "Contato" },
  { fonte: "atendimento", nome: "Atendimento" },
  { fonte: "card", nome: "Card" },
  { fonte: "utm", nome: "UTM" },
];

export type CampoCatalogo = {
  fonte: FonteCampo;
  campo: string;
  nome: string; // nome original
  rotulo: string; // nome exibido (ajuste ou original)
  tipo: TipoCampo;
  usos: UsoCampo[];
  oculto: boolean;
  preenchidos: number;
  opcoes?: string[];
};
export type GrupoCatalogo = { fonte: FonteCampo; nome: string; campos: CampoCatalogo[] };

export type DefinicaoCampo = { key: string; name?: string | null; type?: string | null; entityType?: string | null; options?: unknown };
export type ContatoBase = {
  id: string; nome?: string | null; telefone?: string | null; status?: string | null; etiquetas?: string[]; origem?: string | null;
  utm_source?: string | null; utm_medium?: string | null; utm_campaign?: string | null; criado_em?: string | null; cf?: Record<string, unknown> | null;
  /** Todas as UTMs que o Elora fornecer (além de source/medium/campaign). */
  utm?: Record<string, unknown> | null;
};
export type AtendimentoBase = {
  id: string; contato_id: string | null; canal?: string | null; atendente?: string | null; equipe?: string | null; classificacao?: string | null;
  status?: string | null; criado_em?: string | null; tempo_espera?: number | null; tempo_atendimento?: number | null;
};
export type CardBase = {
  id: string; contato_ids: string[]; painel?: string | null; etapa?: string | null; fase?: string | null; status?: string | null;
  valor?: number | null; criado_em?: string | null; atualizado_em?: string | null; cf?: Record<string, unknown> | null;
};
export type BaseCampos = { definicoes: DefinicaoCampo[]; contatos: ContatoBase[]; atendimentos: AtendimentoBase[]; cards: CardBase[] };
export type AjusteCampo = { fonte: FonteCampo; campo: string; rotulo?: string | null; oculto?: boolean };

/** Campos que o motor de colunas (Matriz) sabe ler; só estes viram "coluna". */
const COLUNA_OK = (f: FonteCampo, c: string) =>
  f === "utm" || (f === "contato" && (c === "origem" || c.startsWith("campo."))) || (f === "card" && (c === "valor" || c.startsWith("campo.")));

type Fixo = { campo: string; nome: string; tipo: TipoCampo; ler: (r: any) => unknown };
const FIXOS: Record<Exclude<FonteCampo, "utm">, Fixo[]> = {
  contato: [
    { campo: "nome", nome: "Nome", tipo: "texto", ler: (r) => r.nome },
    { campo: "telefone", nome: "Telefone", tipo: "texto", ler: (r) => r.telefone },
    { campo: "status", nome: "Status", tipo: "lista", ler: (r) => r.status },
    { campo: "etiquetas", nome: "Etiquetas", tipo: "lista", ler: (r) => r.etiquetas ?? [] },
    { campo: "origem", nome: "Origem", tipo: "lista", ler: (r) => r.origem },
    { campo: "criado_em", nome: "Data de criação", tipo: "data", ler: (r) => r.criado_em },
  ],
  atendimento: [
    { campo: "criado_em", nome: "Data", tipo: "data", ler: (r) => r.criado_em },
    { campo: "canal", nome: "Canal", tipo: "lista", ler: (r) => r.canal },
    { campo: "atendente", nome: "Atendente", tipo: "lista", ler: (r) => r.atendente },
    { campo: "equipe", nome: "Equipe", tipo: "lista", ler: (r) => r.equipe },
    { campo: "classificacao", nome: "Classificação", tipo: "lista", ler: (r) => r.classificacao },
    { campo: "status", nome: "Status", tipo: "lista", ler: (r) => r.status },
    { campo: "tempo_espera", nome: "Tempo de espera (s)", tipo: "numero", ler: (r) => r.tempo_espera },
    { campo: "tempo_atendimento", nome: "Tempo de atendimento (s)", tipo: "numero", ler: (r) => r.tempo_atendimento },
  ],
  card: [
    { campo: "id", nome: "ID do card", tipo: "texto", ler: (r) => r.id },
    { campo: "painel", nome: "Painel", tipo: "lista", ler: (r) => r.painel },
    { campo: "etapa", nome: "Etapa", tipo: "lista", ler: (r) => r.etapa },
    { campo: "fase", nome: "Fase da etapa", tipo: "lista", ler: (r) => r.fase },
    { campo: "status", nome: "Status", tipo: "lista", ler: (r) => r.status },
    { campo: "valor", nome: "Valor", tipo: "moeda", ler: (r) => r.valor },
    { campo: "criado_em", nome: "Data de criação", tipo: "data", ler: (r) => r.criado_em },
    { campo: "atualizado_em", nome: "Última atualização", tipo: "data", ler: (r) => r.atualizado_em },
  ],
};
const UTM: Fixo[] = [
  { campo: "source", nome: "utm_source", tipo: "lista", ler: (r) => r.utm_source },
  { campo: "medium", nome: "utm_medium", tipo: "lista", ler: (r) => r.utm_medium },
  { campo: "campaign", nome: "utm_campaign", tipo: "lista", ler: (r) => r.utm_campaign },
];

export const preenchidoCampo = (v: unknown): boolean =>
  v != null && !(typeof v === "string" && v.trim() === "") && !(Array.isArray(v) && v.length === 0);

/** Valor bruto de um campo num registro da fonte. */
export function valorDe(fonte: FonteCampo, campo: string, r: any): unknown {
  if (!r) return null;
  if (campo.startsWith("campo.")) return r.cf?.[campo.slice(6)] ?? null;
  const lista = fonte === "utm" ? UTM : FIXOS[fonte];
  const fixo = lista.find((f) => f.campo === campo);
  if (fixo) return fixo.ler(r) ?? null;
  return fonte === "utm" ? (r.utm?.[campo] ?? null) : null;
}

const tipoDaDefinicao = (t?: string | null): TipoCampo | null => {
  const x = String(t ?? "").toUpperCase();
  if (!x) return null;
  if (x.includes("DATE") || x.includes("TIME")) return "data";
  if (x.includes("CURRENCY") || x.includes("MONEY")) return "moeda";
  if (x.includes("NUMBER") || x.includes("DECIMAL") || x.includes("INTEGER")) return "numero";
  if (x.includes("SELECT") || x.includes("LIST") || x.includes("TAG")) return "lista";
  if (x.includes("BOOL") || x.includes("CHECK")) return "simnao";
  return "texto";
};
function tipoDosValores(vals: unknown[]): TipoCampo {
  // o Elora embrulha valores de campo em lista: [valor]
  const multi = vals.some((x) => Array.isArray(x) && x.length > 1);
  const v = vals.flatMap((x) => (Array.isArray(x) ? x : [x])).filter(preenchidoCampo);
  if (!v.length) return "texto";
  if (multi) return "lista";
  if (v.every((x) => typeof x === "boolean")) return "simnao";
  if (v.every((x) => typeof x === "number" || (typeof x === "string" && /^-?\d+([.,]\d+)?$/.test(x)))) return "numero";
  if (v.every((x) => typeof x === "string" && /^\d{4}-\d{2}-\d{2}/.test(x))) return "data";
  return new Set(v.map(String)).size <= 50 ? "lista" : "texto";
}

const textos = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => (x && typeof x === "object" ? String((x as any).name ?? (x as any).value ?? JSON.stringify(x)) : String(x))) : preenchidoCampo(v) ? [typeof v === "object" ? String((v as any).name ?? (v as any).value ?? JSON.stringify(v)) : String(v)] : [];

function opcoesDe(vals: unknown[]): string[] {
  const s = new Set<string>();
  let vazio = false;
  for (const v of vals) {
    const t = textos(v);
    if (!t.length) vazio = true;
    for (const x of t) s.add(x);
  }
  const l = [...s].sort((a, b) => a.localeCompare(b)).slice(0, 300);
  return vazio ? [...l, NAO_DEFINIDO] : l;
}

const prettify = (k: string) => k.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function campoDe(fonte: FonteCampo, campo: string, nome: string, tipoBase: TipoCampo | null, vals: unknown[]): CampoCatalogo {
  const tipo = tipoBase ?? tipoDosValores(vals);
  const usos: UsoCampo[] = ["filtro"];
  if (COLUNA_OK(fonte, campo)) usos.push("coluna");
  if (tipo === "lista" || tipo === "data" || tipo === "simnao") usos.push("grafico");
  return {
    fonte, campo, nome, rotulo: nome, tipo, usos, oculto: false,
    preenchidos: vals.filter(preenchidoCampo).length,
    ...(tipo === "lista" || tipo === "simnao" ? { opcoes: opcoesDe(vals) } : {}),
  };
}

/** Personalizados: se o Elora tem definições para a entidade, elas mandam (campo removido sai); senão, as chaves vistas. */
function personalizados(fonte: "contato" | "card", regs: { cf?: Record<string, unknown> | null }[], defs: DefinicaoCampo[]): CampoCatalogo[] {
  const ent = fonte === "contato" ? /CONTACT|CONTATO/i : /CARD|PANEL|CRM/i;
  const minhas = defs.filter((d) => d.key && ent.test(String(d.entityType ?? (fonte === "contato" ? "CONTACT" : ""))));
  const chaves = minhas.length ? minhas.map((d) => d.key) : [...new Set(regs.flatMap((r) => Object.keys(r.cf ?? {})))];
  return chaves
    .map((k) => {
      const d = minhas.find((x) => x.key === k);
      return campoDe(fonte, `campo.${k}`, d?.name || prettify(k), tipoDaDefinicao(d?.type), regs.map((r) => r.cf?.[k] ?? null));
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

export function montarCatalogo(base: BaseCampos, ajustes: AjusteCampo[] = []): GrupoCatalogo[] {
  const fixos = (fonte: FonteCampo, lista: Fixo[], regs: any[]) =>
    lista.map((f) => campoDe(fonte, f.campo, f.nome, f.tipo, regs.map(f.ler))).filter((c) => c.preenchidos > 0);
  const g: Record<FonteCampo, CampoCatalogo[]> = {
    contato: base.contatos.length ? [...fixos("contato", FIXOS.contato, base.contatos), ...personalizados("contato", base.contatos, base.definicoes)] : [],
    atendimento: base.atendimentos.length ? fixos("atendimento", FIXOS.atendimento, base.atendimentos) : [],
    card: base.cards.length ? [...fixos("card", FIXOS.card, base.cards), ...personalizados("card", base.cards, base.definicoes)] : [],
    utm: [
      ...fixos("utm", UTM, base.contatos),
      ...[...new Set(base.contatos.flatMap((c) => Object.keys(c.utm ?? {})))]
        .filter((k) => !UTM.some((u) => u.campo === k || u.nome === `utm_${k}`))
        .map((k) => campoDe("utm", k, k, null, base.contatos.map((c) => c.utm?.[k] ?? null)))
        .filter((c) => c.preenchidos > 0)
        .sort((a, b) => a.nome.localeCompare(b.nome)),
    ],
  };
  const aj = new Map(ajustes.map((a) => [`${a.fonte}|${a.campo}`, a]));
  return FONTES_CATALOGO.map(({ fonte, nome }) => ({
    fonte,
    nome,
    campos: g[fonte].map((c) => {
      const a = aj.get(`${fonte}|${c.campo}`);
      return a ? { ...c, rotulo: a.rotulo?.trim() || c.nome, oculto: Boolean(a.oculto) } : c;
    }),
  })).filter((x) => x.campos.length > 0);
}

/** O que é oferecido fora da tela de configuração: sem ocultos. */
export const catalogoVisivel = (g: GrupoCatalogo[], uso?: UsoCampo) =>
  g.map((x) => ({ ...x, campos: x.campos.filter((c) => !c.oculto && (!uso || c.usos.includes(uso))) })).filter((x) => x.campos.length > 0);

/* ---------------- Filtros ---------------- */

export type OperadorFiltro = "em" | "contem" | "maior" | "menor" | "entre" | "periodo" | "vazio" | "preenchido";
export type FiltroCampo = { fonte: FonteCampo; campo: string; op: OperadorFiltro; valores?: string[]; texto?: string; min?: number; max?: number; de?: string; ate?: string };

export const OPERADORES: Record<TipoCampo, OperadorFiltro[]> = {
  data: ["periodo", "vazio", "preenchido"],
  lista: ["em", "vazio", "preenchido"],
  simnao: ["em", "vazio", "preenchido"],
  texto: ["contem", "vazio", "preenchido"],
  numero: ["maior", "menor", "entre", "vazio", "preenchido"],
  moeda: ["maior", "menor", "entre", "vazio", "preenchido"],
};

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const num = (v: unknown) => (typeof v === "number" ? v : Number(String(v ?? "").replace(",", ".")));
const diaDe = (v: unknown) => {
  const s = String(v ?? "");
  const t = Date.parse(s);
  if (/T|\s\d/.test(s) && Number.isFinite(t)) return new Date(t - 3 * 3600_000).toISOString().slice(0, 10);
  return s.slice(0, 10);
};

export function avaliarFiltro(f: FiltroCampo, v: unknown): boolean {
  const cheio = preenchidoCampo(v);
  if (f.op === "vazio") return !cheio;
  if (f.op === "preenchido") return cheio;
  if (f.op === "em") {
    const vs = f.valores ?? [];
    if (!vs.length) return true;
    const t = textos(v);
    return t.length ? t.some((x) => vs.includes(x)) : vs.includes(NAO_DEFINIDO);
  }
  if (!cheio) return false;
  if (f.op === "contem") return !f.texto || textos(v).some((x) => norm(x).includes(norm(f.texto!)));
  const n = num(v);
  if (f.op === "maior") return Number.isFinite(n) && f.min != null && n > f.min;
  if (f.op === "menor") return Number.isFinite(n) && f.max != null && n < f.max;
  if (f.op === "entre") return Number.isFinite(n) && (f.min == null || n >= f.min) && (f.max == null || n <= f.max);
  if (f.op === "periodo") {
    const d = diaDe(v);
    return (!f.de || d >= f.de) && (!f.ate || d <= f.ate);
  }
  return true;
}

/**
 * Aplica filtros sem juntar linhas: cada filtro vira um conjunto de contatos
 * (campo de atendimento/card liga pelo contato) e os conjuntos se cruzam.
 * Cards: valem os que batem nos filtros de card e, se houver outros filtros, têm contato no conjunto.
 */
export function aplicarFiltrosCampos(base: BaseCampos, filtros: FiltroCampo[]): { contatos: Set<string>; cards: Set<string> } | null {
  if (!filtros.length) return null;
  const conj = (f: FiltroCampo): Set<string> => {
    if (f.fonte === "contato" || f.fonte === "utm") return new Set(base.contatos.filter((c) => avaliarFiltro(f, valorDe(f.fonte, f.campo, c))).map((c) => c.id));
    if (f.fonte === "atendimento") return new Set(base.atendimentos.filter((a) => a.contato_id && avaliarFiltro(f, valorDe("atendimento", f.campo, a))).map((a) => a.contato_id!));
    return new Set(base.cards.filter((c) => avaliarFiltro(f, valorDe("card", f.campo, c))).flatMap((c) => c.contato_ids));
  };
  const cruzar = (l: Set<string>[]) => l.reduce((a, b) => new Set([...a].filter((x) => b.has(x))));
  const contatos = cruzar(filtros.map(conj));
  const deCard = filtros.filter((f) => f.fonte === "card");
  const outros = filtros.filter((f) => f.fonte !== "card");
  const outrosSet = outros.length ? cruzar(outros.map(conj)) : null;
  const cards = new Set(
    base.cards
      .filter((c) => deCard.every((f) => avaliarFiltro(f, valorDe("card", f.campo, c))) && (!outrosSet || c.contato_ids.some((id) => outrosSet.has(id))))
      .map((c) => c.id),
  );
  return { contatos, cards };
}

/** Filtro de campo de outra fonte que a visão: aviso de uma linha. */
export function avisoLigacao(f: Pick<FiltroCampo, "fonte">, fonteDaVisao: FonteCampo | "varias"): string | null {
  if (fonteDaVisao === f.fonte || f.fonte === "contato" || f.fonte === "utm") return null;
  return "Ligado pelo contato: entram os contatos que têm ao menos um registro com esse valor, sem repetir linhas.";
}

/** Separa filtros que a visão já sabe aplicar direto (dimensões nativas) dos que viram conjunto de contatos. */
export function separarFiltros<K extends string>(lista: FiltroCampo[], nativos: Record<K, { fonte: FonteCampo; campo: string }>) {
  const diretos: Partial<Record<K, string[]>> = {};
  const outros: FiltroCampo[] = [];
  for (const f of lista) {
    const k = (Object.keys(nativos) as K[]).find((x) => nativos[x].fonte === f.fonte && nativos[x].campo === f.campo);
    if (k && f.op === "em" && f.valores?.length) diretos[k] = [...(diretos[k] ?? []), ...f.valores];
    else outros.push(f);
  }
  return { diretos, outros };
}

export function descreverFiltro(f: FiltroCampo, rotulo: string): string {
  const dBr = (d?: string) => (d ? d.split("-").reverse().join("/") : "…");
  switch (f.op) {
    case "em": return `${rotulo}: ${(f.valores ?? []).join(", ")}`;
    case "contem": return `${rotulo} contém "${f.texto ?? ""}"`;
    case "maior": return `${rotulo} > ${f.min}`;
    case "menor": return `${rotulo} < ${f.max}`;
    case "entre": return `${rotulo} entre ${f.min ?? "…"} e ${f.max ?? "…"}`;
    case "periodo": return `${rotulo}: ${dBr(f.de)} a ${dBr(f.ate)}`;
    case "vazio": return `${rotulo}: vazio`;
    case "preenchido": return `${rotulo}: preenchido`;
  }
}

export const filtroCampoSchema = z.object({
  fonte: z.enum(["contato", "atendimento", "card", "utm"]),
  campo: z.string().min(1).max(200),
  op: z.enum(["em", "contem", "maior", "menor", "entre", "periodo", "vazio", "preenchido"]),
  valores: z.array(z.string().max(300)).max(100).optional(),
  texto: z.string().max(200).optional(),
  min: z.number().finite().optional(),
  max: z.number().finite().optional(),
  de: z.string().max(10).optional(),
  ate: z.string().max(10).optional(),
});

/** Filtros padrão gravados (visão ou Matriz): só os válidos; vazio quando ausente. */
export function filtrosPadraoValidos(v: unknown): FiltroCampo[] {
  return (Array.isArray(v) ? v : []).filter((f) => filtroCampoSchema.safeParse(f).success) as FiltroCampo[];
}
