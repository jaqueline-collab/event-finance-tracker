/** A conclusão de uma carga não prova cobertura diária. Só intervalos explícitos confirmam zero. */
import { diaSPDe } from "./conferencia";

export const ATRASO_SYNC_MS = 6 * 60 * 60_000;
export type IntervaloCobertura = { de: string; ate: string };
export type Cobertura = {
  fonte: string;
  concluido_em?: string | null;
  cursor?: unknown;
  cobertura?: IntervaloCobertura[] | null;
  ultima_execucao_situacao?: string | null;
};
export type EstadoCobertura = "confirmado" | "aguardando sincronização" | "parcial";
export type OpcoesCobertura = {
  hoje?: string;
  agoraMs?: number;
  diasComDiferenca?: ReadonlySet<string> | readonly string[];
};

/** Grava ou estende o intervalo coberto ao concluir uma rodada (só registra, nunca altera a sincronização). */
export function atualizarIntervaloCobertura(atual: IntervaloCobertura[] | null | undefined, de: string, ate: string): IntervaloCobertura[] {
  const lista = Array.isArray(atual) ? atual.filter((c) => c && typeof c.de === "string" && typeof c.ate === "string") : [];
  if (!lista.length) return [{ de: de <= ate ? de : ate, ate }];
  const menorDe = lista.reduce((m, c) => (c.de < m ? c.de : m), de <= ate ? de : ate);
  const maiorAte = lista.reduce((m, c) => (c.ate > m ? c.ate : m), ate);
  return [{ de: menorDe, ate: maiorAte }];
}

export function estadoCobertura(dia: string, fontes: string[], estados: Cobertura[], opcoes: OpcoesCobertura = {}): EstadoCobertura {
  if (!fontes.length) return "confirmado";
  const agoraMs = opcoes.agoraMs ?? Date.now();
  const hoje = opcoes.hoje ?? diaSPDe(agoraMs);
  // O dia de hoje sempre pode estar incompleto.
  if (dia >= hoje) return "parcial";
  const linhas = fontes.map((f) => estados.find((s) => s.fonte === f));
  if (linhas.some((s) => !s || !s.concluido_em)) return "aguardando sincronização";
  // Fonte atrasada (> 6h) ou última execução com erro dispara aviso.
  if (linhas.some((s) => s!.ultima_execucao_situacao === "erro" || agoraMs - Date.parse(s!.concluido_em!) > ATRASO_SYNC_MS)) return "parcial";
  const diffs = opcoes.diasComDiferenca instanceof Set ? opcoes.diasComDiferenca : new Set(opcoes.diasComDiferenca ?? []);
  if (diffs.has(dia)) return "parcial";
  return linhas.every((s) => s?.cobertura?.some((c) => dia >= c.de && dia <= c.ate)) ? "confirmado" : "parcial";
}