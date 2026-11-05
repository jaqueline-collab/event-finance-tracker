/**
 * Regras do Painel visual do cliente (puras, testáveis).
 * Fuso: America/Sao_Paulo (UTC-3 fixo, sem horário de verão desde 2019).
 */
import { NAO_DEFINIDO } from "./nao-definido";

export type PeriodoChave = "7d" | "30d" | "mes" | "mes_passado" | "personalizado";
export type Periodo = { de: string; ate: string }; // YYYY-MM-DD, inclusivo

export const ROTULO_PERIODO: Record<PeriodoChave, string> = {
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  mes: "Este mês",
  mes_passado: "Mês passado",
  personalizado: "Personalizado",
};

const OFFSET_MS = 3 * 3600_000;
const DIA_MS = 86400_000;

/** Dia (YYYY-MM-DD) em São Paulo de um instante ISO. */
export function diaSP(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return new Date(t - OFFSET_MS).toISOString().slice(0, 10);
}

const somaDias = (dia: string, n: number) =>
  new Date(Date.parse(`${dia}T00:00:00Z`) + n * DIA_MS).toISOString().slice(0, 10);

export const diasEntre = (p: Periodo) =>
  Math.round((Date.parse(`${p.ate}T00:00:00Z`) - Date.parse(`${p.de}T00:00:00Z`)) / DIA_MS) + 1;

export function listaDias(p: Periodo): string[] {
  const n = diasEntre(p);
  return Array.from({ length: Math.max(0, n) }, (_, i) => somaDias(p.de, i));
}

export function periodoDe(chave: Exclude<PeriodoChave, "personalizado">, agoraIso: string): Periodo {
  const hoje = diaSP(agoraIso)!;
  if (chave === "7d") return { de: somaDias(hoje, -6), ate: hoje };
  if (chave === "30d") return { de: somaDias(hoje, -29), ate: hoje };
  const [a, m] = hoje.split("-").map(Number);
  if (chave === "mes") return { de: `${hoje.slice(0, 7)}-01`, ate: hoje };
  const pa = m === 1 ? a - 1 : a;
  const pm = m === 1 ? 12 : m - 1;
  const ini = `${pa}-${String(pm).padStart(2, "0")}-01`;
  return { de: ini, ate: somaDias(`${hoje.slice(0, 7)}-01`, -1) };
}

/** Período anterior com o mesmo número de dias, logo antes. */
export function periodoAnterior(p: Periodo): Periodo {
  const n = diasEntre(p);
  return { de: somaDias(p.de, -n), ate: somaDias(p.de, -1) };
}

/** Limites UTC de um período em São Paulo. */
export const limitesUtc = (p: Periodo) => ({
  inicio: `${p.de}T03:00:00.000Z`,
  fim: new Date(Date.parse(`${somaDias(p.ate, 1)}T03:00:00.000Z`) - 1).toISOString(),
});

/** 4800 → "1h 20min"; 90 → "1min 30s"; 40 → "40s"; 97h → "4d 1h". */
export function formatarDuracao(seg: number | null | undefined): string {
  if (seg == null || !Number.isFinite(seg)) return "—";
  const s = Math.round(seg);
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h >= 24) return h % 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${Math.floor(h / 24)}d`;
  if (h > 0) return m ? `${h}h ${m}min` : `${h}h`;
  const r = s % 60;
  return r ? `${m}min ${r}s` : `${m}min`;
}

/** Variação % contra o anterior; null quando não há base. */
export function variacao(atual: number, anterior: number): number | null {
  if (!anterior) return null;
  return ((atual - anterior) / anterior) * 100;
}

/** Tipos de mensagem que não contam como conversa realizada. */
export const TIPOS_IGNORADOS = new Set(["NOTE", "TRANSITION", "TRACK"]);

export const ROTULO_ORIGEM: Record<string, string> = {
  IMPORTED: "Importado",
  CREATED_FROM_HUB: "Chegou pelo WhatsApp",
  CREATED_BY_USER: "Cadastrado pela equipe",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  GOOGLE: "Google",
};

const titulo = (v: string) => v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
export function origemDoLead(utmSource: string | null, origem: string | null): string {
  const v = utmSource || origem;
  if (!v) return NAO_DEFINIDO;
  return ROTULO_ORIGEM[v.toUpperCase()] ?? titulo(v);
}

/** `importado` = origem IMPORTED no Elora (importação em massa): fora dos leads por padrão. */
export type ContatoP = { id: string; criado_em: string | null; origem: string; etiquetas: string[]; campanha: string | null; importado?: boolean };

/** Sem filtro de Origem, importados não contam como lead; com filtro de Origem, contam. */
export const contaComoLead = (c: ContatoP, filtros: Filtros) => Boolean(filtros.origem) || !c.importado;
export type AtendimentoP = {
  id: string;
  contato_id: string | null;
  canal: string;
  atendente: string;
  criado_em: string | null;
  tmr: number | null;
  tma: number | null;
};
/** Só mensagens TO_HUB; `origem` é a origem da mensagem no Elora (DEFAULT = pessoa pela plataforma). */
export type MensagemP = { sessao_id: string; enviada_em: string | null; tipo: string | null; origem: string | null };

export type Dimensao = "origem" | "canal" | "etiqueta" | "campanha" | "atendente";
export type Filtros = Partial<Record<Dimensao, string>>;
export const DIMENSOES: { chave: Dimensao; rotulo: string; todos: string }[] = [
  { chave: "canal", rotulo: "Canal", todos: "todos" },
  { chave: "origem", rotulo: "Origem", todos: "todas" },
  { chave: "atendente", rotulo: "Atendente", todos: "todos" },
  { chave: "etiqueta", rotulo: "Etiqueta", todos: "todas" },
  { chave: "campanha", rotulo: "Campanha", todos: "todas" },
];

export const SEM_ATENDENTE = NAO_DEFINIDO;

/**
 * Conversas realizadas por dia (São Paulo): cada par atendimento+dia com
 * ao menos uma mensagem TO_HUB válida. "Usuário" = alguma mensagem de pessoa
 * pela plataforma (origem DEFAULT); senão "Bot".
 */
export function conversasPorDia(msgs: MensagemP[], sessoesOk?: Set<string>) {
  const pares = new Map<string, { sessao: string; dia: string; usuario: boolean }>();
  for (const m of msgs) {
    if (m.tipo && TIPOS_IGNORADOS.has(m.tipo)) continue;
    if (sessoesOk && !sessoesOk.has(m.sessao_id)) continue;
    const dia = diaSP(m.enviada_em);
    if (!dia) continue;
    const k = `${m.sessao_id}|${dia}`;
    const p = pares.get(k) ?? { sessao: m.sessao_id, dia, usuario: false };
    if (m.origem === "DEFAULT") p.usuario = true;
    pares.set(k, p);
  }
  return [...pares.values()];
}

const dentro = (dia: string | null, p: Periodo) => !!dia && dia >= p.de && dia <= p.ate;

export type ResumoPainel = ReturnType<typeof agregarPainel>;

export function agregarPainel(
  base: { contatos: ContatoP[]; atendimentos: AtendimentoP[]; mensagens: MensagemP[] },
  periodo: Periodo,
  filtros: Filtros,
) {
  const anterior = periodoAnterior(periodo);
  const contatoPorId = new Map(base.contatos.map((c) => [c.id, c]));
  const sessoesPorContato = new Map<string, AtendimentoP[]>();
  for (const a of base.atendimentos) {
    if (!a.contato_id) continue;
    const l = sessoesPorContato.get(a.contato_id) ?? [];
    l.push(a);
    sessoesPorContato.set(a.contato_id, l);
  }
  const canalDoContato = (id: string) => {
    const l = sessoesPorContato.get(id);
    if (!l?.length) return NAO_DEFINIDO;
    return l.slice().sort((x, y) => String(x.criado_em).localeCompare(String(y.criado_em)))[0].canal;
  };

  const temFiltroContato = Boolean(filtros.origem || filtros.etiqueta || filtros.campanha);
  const contatoOk = (c: ContatoP | undefined) =>
    !!c &&
    (!filtros.origem || c.origem === filtros.origem) &&
    (!filtros.etiqueta || (filtros.etiqueta === NAO_DEFINIDO ? c.etiquetas.length === 0 : c.etiquetas.includes(filtros.etiqueta))) &&
    (!filtros.campanha || (c.campanha ?? NAO_DEFINIDO) === filtros.campanha);
  const sessaoAtributosOk = (a: AtendimentoP) =>
    (!filtros.canal || a.canal === filtros.canal) && (!filtros.atendente || a.atendente === filtros.atendente);
  const sessaoOk = (a: AtendimentoP) =>
    sessaoAtributosOk(a) && (!temFiltroContato || contatoOk(a.contato_id ? contatoPorId.get(a.contato_id) : undefined));
  const leadOk = (c: ContatoP) =>
    contatoOk(c) && (!(filtros.canal || filtros.atendente) || (sessoesPorContato.get(c.id) ?? []).some(sessaoAtributosOk));

  const sessoes = base.atendimentos.filter(sessaoOk);
  const sessoesIds = new Set(sessoes.map((s) => s.id));
  const sessaoPorId = new Map(sessoes.map((s) => [s.id, s]));
  const leads = base.contatos.filter(leadOk);
  const pares = conversasPorDia(base.mensagens, sessoesIds);

  const media = (l: (number | null)[]) => {
    const v = l.filter((x): x is number => x != null && Number.isFinite(x));
    return { valor: v.length ? v.reduce((a, b) => a + b, 0) / v.length : null, medidas: v.length };
  };
  const leadsTodos = leads;
  const leadsContados = leadsTodos.filter((c) => contaComoLead(c, filtros));
  const kpis = (p: Periodo) => {
    const ls = leadsContados.filter((c) => dentro(diaSP(c.criado_em), p));
    const ss = sessoes.filter((s) => dentro(diaSP(s.criado_em), p));
    return {
      novosLeads: ls.length,
      leadsAds: ls.filter((c) => c.campanha).length,
      importadosFora: leadsTodos.filter((c) => !contaComoLead(c, filtros) && dentro(diaSP(c.criado_em), p)).length,
      conversas: pares.filter((x) => dentro(x.dia, p)).length,
      tmr: media(ss.map((s) => s.tmr)),
      tma: media(ss.map((s) => s.tma)),
    };
  };

  const dias = listaDias(periodo);
  const leadsPeriodo = leadsContados.filter((c) => dentro(diaSP(c.criado_em), periodo));
  const sessoesPeriodo = sessoes.filter((s) => dentro(diaSP(s.criado_em), periodo));
  const paresPeriodo = pares.filter((x) => dentro(x.dia, periodo));

  const porDia = dias.map((dia) => {
    const l = leadsPeriodo.filter((c) => diaSP(c.criado_em) === dia);
    const cv = paresPeriodo.filter((x) => x.dia === dia);
    const ads = l.filter((c) => c.campanha).length;
    const usuario = cv.filter((x) => x.usuario).length;
    return { dia, leads: l.length, ads, organicos: l.length - ads, usuario, bot: cv.length - usuario };
  });

  const contar = (vals: string[], top?: number) => {
    const m = new Map<string, number>();
    for (const v of vals) m.set(v, (m.get(v) ?? 0) + 1);
    const l = [...m.entries()].map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome));
    return top ? l.slice(0, top) : l;
  };

  const leadsPor: Record<"origem" | "canal" | "etiqueta" | "campanha", { nome: string; valor: number }[]> = {
    origem: contar(leadsPeriodo.map((c) => c.origem)),
    canal: contar(leadsPeriodo.map((c) => canalDoContato(c.id))),
    etiqueta: contar(leadsPeriodo.flatMap((c) => (c.etiquetas.length ? c.etiquetas : [NAO_DEFINIDO]))),
    campanha: contar(leadsPeriodo.map((c) => c.campanha ?? NAO_DEFINIDO)),
  };

  const conversasPorAtendente = new Map<string, number>();
  for (const x of paresPeriodo) {
    const a = sessaoPorId.get(x.sessao)?.atendente ?? SEM_ATENDENTE;
    conversasPorAtendente.set(a, (conversasPorAtendente.get(a) ?? 0) + 1);
  }
  const atendentes = contar(sessoesPeriodo.map((s) => s.atendente))
    .map((a) => ({ nome: a.nome, atendimentos: a.valor, conversas: conversasPorAtendente.get(a.nome) ?? 0 }));
  for (const [nome, conversas] of conversasPorAtendente)
    if (!atendentes.some((a) => a.nome === nome)) atendentes.push({ nome, atendimentos: 0, conversas });

  const opcoes: Record<Dimensao, string[]> = {
    canal: [...new Set(base.atendimentos.map((a) => a.canal))].sort(),
    atendente: [...new Set(base.atendimentos.map((a) => a.atendente))].sort(),
    origem: [...new Set(base.contatos.map((c) => c.origem))].sort(),
    etiqueta: [...new Set(base.contatos.flatMap((c) => c.etiquetas))].sort(),
    campanha: [...new Set(base.contatos.map((c) => c.campanha).filter((v): v is string => !!v))].sort(),
  };

  return {
    periodo,
    anterior,
    kpis: { atual: kpis(periodo), anterior: kpis(anterior) },
    porDia,
    leadsPor,
    campanhas: contar(leadsPeriodo.map((c) => c.campanha).filter((v): v is string => !!v), 8),
    canais: contar(sessoesPeriodo.map((s) => s.canal)),
    atendentes,
    opcoes,
  };
}
