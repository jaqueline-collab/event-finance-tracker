/** Exibição do estado de sincronização por fonte (pura, só leitura). */
export type FonteSync = {
  fonte: string;
  iniciadoEm: string | null;
  concluidoEm: string | null;
  registros: number;
  atualizadoEm: string | null;
  comErro: boolean;
  ultimoErro?: string | null;
  ultimoErroEm?: string | null;
  ultimaExecucaoEm?: string | null;
  ultimaExecucaoConcluida?: boolean | null;
  ultimaExecucaoRegistros?: number | null;
  ultimaExecucaoSituacao?: string | null;
  ultimoRegistroEm?: string | null;
};

export type ChecagemDia = { checadoEm: string; dia: string; amostra: number; nosso: number; elora: number; diferenca: number };

/** Atrasada: sem conclusão há mais de `horas` (ou nunca concluída). */
export function fonteAtrasada(f: FonteSync | undefined, agora = Date.now(), horas = 6): boolean {
  return !f?.concluidoEm || agora - new Date(f.concluidoEm).getTime() > horas * 3_600_000;
}

const SITUACAO: Record<string, string> = { concluida: "concluída", em_andamento: "não terminou, continua na próxima", sem_tempo: "ficou sem tempo", erro: "erro" };
export function rotuloExecucao(f: FonteSync | undefined): string | null {
  if (!f?.ultimaExecucaoEm) return null;
  const sit = SITUACAO[f.ultimaExecucaoSituacao ?? ""] ?? (f.ultimaExecucaoConcluida ? "concluída" : "não terminou");
  return `${dataHora(f.ultimaExecucaoEm)}: ${sit}, ${num(f.ultimaExecucaoRegistros ?? 0)} registros`;
}

export const ORDEM_FONTES = ["contatos", "atendimentos", "mensagens", "cards", "apoio"] as const;

export const NOME_FONTE_SYNC: Record<string, string> = {
  contatos: "Contatos",
  atendimentos: "Atendimentos",
  mensagens: "Mensagens",
  cards: "Cards",
  apoio: "Listas da conta",
};

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).replace(",", "");

const num = (n: number) => n.toLocaleString("pt-BR");

export function rotuloFonte(f: FonteSync | undefined): string {
  if (!f || (!f.iniciadoEm && !f.concluidoEm)) return "Ainda não sincronizado";
  const concluida =
    f.concluidoEm && (!f.iniciadoEm || new Date(f.concluidoEm) >= new Date(f.iniciadoEm));
  if (concluida) return `Concluída em ${dataHora(f.concluidoEm!)} (${num(f.registros)} registros)`;
  return `Em andamento, ${num(f.registros)} registros`;
}

export function ultimaRodada(fontes: FonteSync[]): string | null {
  let max: string | null = null;
  for (const f of fontes) if (f.atualizadoEm && (!max || f.atualizadoEm > max)) max = f.atualizadoEm;
  return max ? dataHora(max) : null;
}

/** Fonte sem atualização há mais de `horas` (ou nunca atualizada): alerta para a super admin. */
export function fonteParada(f: FonteSync | undefined, agora = Date.now(), horas = 6): boolean {
  return !f?.atualizadoEm || agora - new Date(f.atualizadoEm).getTime() > horas * 3_600_000;
}
export const dataHoraSync = dataHora;
