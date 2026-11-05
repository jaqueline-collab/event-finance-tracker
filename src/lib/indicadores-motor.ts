/**
 * Motor único do relatório diário (lógica pura, sem banco).
 * Colunas padrão vêm do sistema; colunas de cards vêm da configuração de
 * cada cliente (elora_indicadores_config). Nenhuma regra de cliente aqui.
 */
import { conversasPorDia, diaSP, type MensagemP } from "./painel-visual";

export type Operador = "preenchido" | "vazio" | "igual" | "contem";
export type FonteCampo = "card" | "contato" | "atendimento" | "utm";
/** Campo sempre com a fonte escolhida na configuração. Nada no código decide a fonte. */
export type CampoRef = { fonte: FonteCampo; campo: string };
export type Condicao = { campo: CampoRef; operador: Operador; valor?: string };
export type Grupo = { op: "E" | "OU"; itens: (Condicao | Grupo)[] };
export type Evento =
  | { tipo: "entrou_etapa"; etapa: string }
  | { tipo: "virou_ganho" }
  | { tipo: "virou_perdido" }
  | { tipo: "campo_preenchido"; campo: CampoRef }
  | { tipo: "foi_criado" };

export type IndicadorConfig = {
  chave: string;
  nome: string;
  fonte: "contatos" | "conversas" | "cards";
  medida: "contagem" | "soma" | "media";
  evento: Evento | Record<string, never>;
  condicoes: Grupo;
  ordem: number;
  tipo: "app" | "manual" | "combinada" | "formula";
  ativo: boolean;
  /** Campos de contato em indicador de card: qual contato do card usar. */
  contato_do_card?: "primeiro";
};

/** Uma leitura do card: como ele estava quando o sistema o viu. */
export type Leitura = {
  card_id: string;
  visto_em: string;
  estimado: boolean;
  etapa_id: string | null;
  etapa_titulo: string | null;
  status: string | null;
  criado_em: string | null;
  campos: Record<string, unknown>;
};

export const COLUNAS_PADRAO = [
  { chave: "novos_contatos", nome: "Novos contatos" },
  { chave: "novos_contatos_ads", nome: "Novos ADS" },
  { chave: "conversas_total_dia", nome: "Conversas realizadas" },
  { chave: "conversas_usuario", nome: "Usuário do sistema" },
  { chave: "conversas_bot", nome: "Bot" },
] as const;

export const preenchido = (v: unknown): boolean => {
  if (v == null) return false;
  if (Array.isArray(v)) return v.some(preenchido);
  if (typeof v === "string") return v.trim() !== "";
  return true;
};
const texto = (v: unknown) => (Array.isArray(v) ? v.map(String).join(" ") : v == null ? "" : String(v)).toLowerCase();

const ehGrupo = (x: Condicao | Grupo): x is Grupo => (x as Grupo).itens !== undefined;

export function avaliarGrupo(g: Grupo | undefined, campos: Record<string, unknown>): boolean {
  if (!g || !g.itens?.length) return true;
  const res = g.itens.map((i) => (ehGrupo(i) ? avaliarGrupo(i, campos) : avaliarCondicao(i, campos)));
  return g.op === "OU" ? res.some(Boolean) : res.every(Boolean);
}

export const FONTES: FonteCampo[] = ["card", "contato", "atendimento", "utm"];
export const ehCampoRef = (x: unknown): x is CampoRef =>
  !!x && typeof x === "object" && FONTES.includes((x as any).fonte) && typeof (x as any).campo === "string" && (x as any).campo !== "";

/** Chave interna da leitura para {fonte, campo}. UTM vem do contato ligado ao card. */
export function chaveLeitura(ref: CampoRef): string {
  if (ref.fonte === "utm") return `contato.utm_${ref.campo.replace(/^utm_/, "")}`;
  return `${ref.fonte}.${ref.campo}`;
}

/** Condições/eventos sem fonte são erro de configuração: não contam e são listados. */
export function errosDeConfig(cfg: IndicadorConfig): string[] {
  const erros: string[] = [];
  const ver = (g: Grupo | undefined) =>
    g?.itens?.forEach((i) => {
      if (ehGrupo(i)) return ver(i);
      if (!ehCampoRef(i.campo)) erros.push(`condição sem fonte: ${JSON.stringify(i.campo)}`);
    });
  ver(cfg.condicoes);
  const ev = cfg.evento as Evento;
  if (ev?.tipo === "campo_preenchido" && !ehCampoRef(ev.campo)) erros.push("evento sem fonte");
  return erros;
}

export function avaliarCondicao(c: Condicao, campos: Record<string, unknown>): boolean {
  if (!ehCampoRef(c.campo)) return false;
  const v = campos[chaveLeitura(c.campo)];
  switch (c.operador) {
    case "preenchido":
      return preenchido(v);
    case "vazio":
      return !preenchido(v);
    case "igual":
      return texto(v) === String(c.valor ?? "").toLowerCase();
    case "contem":
      return texto(v).includes(String(c.valor ?? "").toLowerCase());
  }
}

export function eventoVale(ev: Evento, l: Leitura): boolean {
  switch (ev.tipo) {
    case "entrou_etapa": {
      const alvo = ev.etapa.trim().toLowerCase();
      return (l.etapa_titulo ?? "").trim().toLowerCase() === alvo || l.etapa_id === ev.etapa;
    }
    case "virou_ganho":
      return l.status === "WON";
    case "virou_perdido":
      return l.status === "LOST";
    case "campo_preenchido":
      return ehCampoRef(ev.campo) && preenchido(l.campos[chaveLeitura(ev.campo)]);
    case "foi_criado":
      return true;
  }
}

/**
 * Dia (São Paulo) em que o card passa a contar: a primeira leitura em que
 * evento e todas as condições valem. Conta uma vez e continua contado.
 */
export function diaDoCard(cfg: IndicadorConfig, leituras: Leitura[]): { dia: string; estimado: boolean } | null {
  const ev = cfg.evento as Evento;
  if (!ev?.tipo || errosDeConfig(cfg).length) return null;
  const ordenadas = [...leituras].sort((a, b) => a.visto_em.localeCompare(b.visto_em));
  for (const l of ordenadas) {
    if (!eventoVale(ev, l) || !avaliarGrupo(cfg.condicoes, l.campos)) continue;
    if (ev.tipo === "foi_criado") {
      const d = diaSP(l.criado_em);
      return d ? { dia: d, estimado: false } : null;
    }
    const d = diaSP(l.visto_em);
    return d ? { dia: d, estimado: l.estimado } : null;
  }
  return null;
}

export type Celula = { valor: number; estimado: number };
/** dia → chave → { valor, quantos desse valor são estimados } */
export type PorDia = Map<string, Record<string, Celula>>;

const somar = (m: PorDia, dia: string, chave: string, n: number, est: boolean) => {
  const linha = m.get(dia) ?? {};
  const c = linha[chave] ?? { valor: 0, estimado: 0 };
  c.valor += n;
  if (est) c.estimado += n;
  linha[chave] = c;
  m.set(dia, linha);
};

/** Colunas de cards calculadas pela configuração do cliente. */
export function calcularIndicadoresCards(configs: IndicadorConfig[], leituras: Leitura[], m: PorDia = new Map()): PorDia {
  const porCard = new Map<string, Leitura[]>();
  for (const l of leituras) porCard.set(l.card_id, [...(porCard.get(l.card_id) ?? []), l]);
  for (const cfg of configs) {
    if (!cfg.ativo || cfg.tipo !== "app" || cfg.fonte !== "cards") continue;
    for (const ls of porCard.values()) {
      const r = diaDoCard(cfg, ls);
      if (r) somar(m, r.dia, cfg.chave, 1, r.estimado);
    }
  }
  return m;
}

export type ContatoMotor = { criado_em: string | null; origem: string | null; utm_campaign: string | null };

/** Colunas padrão (já validadas contra o monday): sem IMPORTED; ADS = utm_campaign preenchido. */
export function calcularPadrao(contatos: ContatoMotor[], mensagens: MensagemP[], m: PorDia = new Map()): PorDia {
  for (const c of contatos) {
    if (String(c.origem ?? "").toUpperCase() === "IMPORTED") continue;
    const d = diaSP(c.criado_em);
    if (!d) continue;
    somar(m, d, "novos_contatos", 1, false);
    if (preenchido(c.utm_campaign)) somar(m, d, "novos_contatos_ads", 1, false);
  }
  for (const p of conversasPorDia(mensagens)) {
    somar(m, p.dia, "conversas_total_dia", 1, false);
    somar(m, p.dia, p.usuario ? "conversas_usuario" : "conversas_bot", 1, false);
  }
  return m;
}

export type LinhaRelatorio = { dia: string; valores: Record<string, Celula> };

/** Linhas do período (todos os dias, vazios com zero) + linha de total. */
export function montarRelatorio(m: PorDia, dias: string[], chaves: string[]) {
  const vazia = () => Object.fromEntries(chaves.map((k) => [k, { valor: 0, estimado: 0 }]));
  const linhas: LinhaRelatorio[] = dias.map((dia) => ({ dia, valores: { ...vazia(), ...(m.get(dia) ?? {}) } }));
  const total = vazia() as Record<string, Celula>;
  for (const l of linhas)
    for (const k of chaves) {
      total[k].valor += l.valores[k]?.valor ?? 0;
      total[k].estimado += l.valores[k]?.estimado ?? 0;
    }
  return { linhas, total };
}

/** Colunas que o cliente vê: padrão + as de cards configuradas (vazias se não houver). */
export function colunasDoCliente(configs: IndicadorConfig[]) {
  return [
    ...COLUNAS_PADRAO.map((c) => ({ chave: c.chave, nome: c.nome, tipo: "padrao" as const })),
    ...configs
      .filter((c) => c.ativo)
      .sort((a, b) => a.ordem - b.ordem)
      .map((c) => ({ chave: c.chave, nome: c.nome, tipo: c.tipo })),
  ];
}

/** Campos do card + do primeiro contato, para as condições. */
export function camposDaLeitura(card: any, contato: any | null): Record<string, unknown> {
  const campos: Record<string, unknown> = {
    "card.titulo": card?.title ?? null,
    "card.valor": card?.monetaryAmount ?? null,
    "card.responsavel": card?.responsibleUser?.name ?? card?.responsibleUserId ?? null,
    "card.etiquetas": card?.tagIds ?? [],
    "card.motivo_perda": card?.lostReason?.name ?? null,
  };
  for (const [k, v] of Object.entries(card?.customFields ?? {})) campos[`card.campo.${k}`] = v;
  if (contato) {
    campos["contato.utm_campaign"] = contato.utm_campaign ?? null;
    campos["contato.utm_source"] = contato.utm_source ?? null;
    campos["contato.utm_medium"] = contato.utm_medium ?? null;
    campos["contato.origem"] = contato.origem ?? null;
    for (const [k, v] of Object.entries(contato.payload?.customFields ?? {})) campos[`contato.campo.${k}`] = v;
  }
  return campos;
}

/** Assinatura estável de uma leitura: grava nova linha só quando muda. */
export function assinatura(l: Pick<Leitura, "etapa_id" | "status" | "campos">): string {
  const ord = Object.keys(l.campos).sort().map((k) => [k, l.campos[k]]);
  return JSON.stringify([l.etapa_id, l.status, ord]);
}

const NOMES_FONTE: Record<FonteCampo, string> = {
  card: "Campos do card",
  contato: "Campos do contato (primeiro contato do card)",
  atendimento: "Atendimento",
  utm: "UTM",
};

/** Catálogo agrupado por fonte; o mesmo nome pode aparecer em duas fontes. */
export function catalogoCampos(leituras: Pick<Leitura, "campos">[]) {
  const grupos: Record<FonteCampo, Map<string, number>> = { card: new Map(), contato: new Map(), atendimento: new Map(), utm: new Map() };
  for (const l of leituras)
    for (const [k, v] of Object.entries(l.campos ?? {})) {
      let fonte: FonteCampo, campo: string;
      if (k.startsWith("contato.utm_")) (fonte = "utm"), (campo = k.slice("contato.utm_".length));
      else {
        const [f, ...r] = k.split(".");
        if (!FONTES.includes(f as FonteCampo)) continue;
        (fonte = f as FonteCampo), (campo = r.join("."));
      }
      const m = grupos[fonte];
      m.set(campo, (m.get(campo) ?? 0) + (preenchido(v) ? 1 : 0));
    }
  return FONTES.map((f) => ({
    fonte: f,
    nome: NOMES_FONTE[f],
    campos: [...grupos[f]].map(([campo, preenchidos]) => ({ campo, preenchidos })).sort((a, b) => a.campo.localeCompare(b.campo)),
  }));
}
