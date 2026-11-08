/** Exibição do estado de sincronização por fonte (pura, só leitura). */
export type FonteSync = {
  fonte: string;
  iniciadoEm: string | null;
  concluidoEm: string | null;
  registros: number;
  atualizadoEm: string | null;
  comErro: boolean;
};

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
  });

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
