// Regras puras da Conferência com o Elora App (sem servidor). Dias sempre no fuso de Brasília.
export const FUSO_CONFERENCIA = "Brasília (America/Sao_Paulo)";
const OFFSET_MS = 3 * 3_600_000; // Brasília sem horário de verão desde 2019.
export const DIAS_CONFERENCIA = 7;
export const ETAPAS_CONFERENCIA = ["atendimentos", "contatos", "cards", "mensagens"] as const;
export type EtapaConferencia = (typeof ETAPAS_CONFERENCIA)[number];
export const ROTULO_ETAPA: Record<EtapaConferencia, string> = {
  atendimentos: "Atendimentos criados",
  contatos: "Contatos novos",
  cards: "Cards criados",
  mensagens: "Mensagens (amostra)",
};
/** Texto explicando o que cada coluna conta (mostrado na tela). */
export const O_QUE_CONTA: Record<EtapaConferencia, string> = {
  atendimentos: "Atendimentos com data de criação no dia.",
  contatos: "Contatos com data de criação no dia, em qualquer situação (ativo, arquivado ou bloqueado).",
  cards: "Cards criados no dia em todos os painéis e em qualquer status: abertos, ganhos, perdidos e arquivados.",
  mensagens: "Conversas sorteadas do dia: mensagens do dia no nosso banco comparadas com o Elora, conversa por conversa.",
};

export type Par = { nosso: number; elora: number };
export type Amostra = { amostra: number; bateram: number; andamento: number };
export type LinhaConferencia = { dia: string; atendimentos?: Par | null; contatos?: Par | null; cards?: Par | null; mensagens?: Amostra | null };
export type EstadoCelula = "ok" | "andamento" | "diverge";

export function diaSPDe(ms: number): string {
  return new Date(ms - OFFSET_MS).toISOString().slice(0, 10);
}
/** Últimos n dias (padrão 7) (o mais antigo primeiro), incluindo hoje. */
export function diasConferencia(agora = Date.now(), n = DIAS_CONFERENCIA): string[] {
  const hoje = diaSPDe(agora);
  const base = Date.parse(`${hoje}T12:00:00Z`);
  return Array.from({ length: n }, (_, i) => new Date(base - (n - 1 - i) * 86_400_000).toISOString().slice(0, 10));
}
/** Meia-noite de Brasília do dia até a meia-noite seguinte, em UTC. */
export function limitesDia(dia: string): { de: string; ate: string } {
  const de = Date.parse(`${dia}T00:00:00Z`) + OFFSET_MS;
  return { de: new Date(de).toISOString(), ate: new Date(de + 86_400_000).toISOString() };
}
/** Verde se igual; "em andamento" só hoje e com diferença de até 1; senão vermelho. */
export function estadoCelula(p: Par, ehHoje: boolean): EstadoCelula {
  const d = Math.abs(p.elora - p.nosso);
  if (d === 0) return "ok";
  if (ehHoje && d <= 1) return "andamento";
  return "diverge";
}
export function estadoAmostra(a: Amostra, ehHoje: boolean): EstadoCelula {
  if (a.bateram === a.amostra) return "ok";
  if (ehHoje && a.bateram + a.andamento === a.amostra) return "andamento";
  return "diverge";
}
export function totais(linhas: LinhaConferencia[]) {
  const soma = (k: "atendimentos" | "contatos" | "cards"): Par | null => {
    const ps = linhas.map((l) => l[k]).filter(Boolean) as Par[];
    return ps.length ? { nosso: ps.reduce((s, p) => s + p.nosso, 0), elora: ps.reduce((s, p) => s + p.elora, 0) } : null;
  };
  const ms = linhas.map((l) => l.mensagens).filter(Boolean) as Amostra[];
  return {
    atendimentos: soma("atendimentos"),
    contatos: soma("contatos"),
    cards: soma("cards"),
    mensagens: ms.length ? { amostra: ms.reduce((s, a) => s + a.amostra, 0), bateram: ms.reduce((s, a) => s + a.bateram, 0), andamento: ms.reduce((s, a) => s + a.andamento, 0) } : null,
  };
}
/** Células vermelhas (dia + coluna), para o selo do card da conexão. */
export function divergencias(linhas: LinhaConferencia[], hoje: string): { dia: string; coluna: EtapaConferencia }[] {
  const out: { dia: string; coluna: EtapaConferencia }[] = [];
  for (const l of linhas) {
    const h = l.dia === hoje;
    for (const k of ["atendimentos", "contatos", "cards"] as const) if (l[k] && estadoCelula(l[k]!, h) === "diverge") out.push({ dia: l.dia, coluna: k });
    if (l.mensagens && estadoAmostra(l.mensagens, h) === "diverge") out.push({ dia: l.dia, coluna: "mensagens" });
  }
  return out;
}
/** Diária: vencida quando não há conferência iniciada desde as 02:55 (Brasília) mais recentes. */
export function conferenciaVencida(ultimaInicioIso: string | null, agora = Date.now()): boolean {
  const hoje = diaSPDe(agora);
  let corte = Date.parse(`${hoje}T02:55:00Z`) + OFFSET_MS;
  if (agora < corte) corte -= 86_400_000;
  return !ultimaInicioIso || Date.parse(ultimaInicioIso) < corte;
}
