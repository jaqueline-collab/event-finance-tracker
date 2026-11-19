/**
 * Rótulo curto de linha de agrupamento (canal, equipe, atendente, etiqueta, origem, campanha,
 * etapa, campo personalizado) quando o valor está vazio: a linha continua identificável e a soma fecha.
 * Em célula de item (tabela, lista do dia, detalhes, exportar) o vazio fica em branco.
 */
export const NAO_DEFINIDO = "Sem informação";
/** Id que o Elora usa para resposta enviada pelo celular (aparelho), sem identificar a pessoa. */
export const ID_CELULAR = "00000000-0000-0000-0000-000000000000";
/** Rótulos só da dimensão de atendente. Pessoa com nome > celular > sem resposta. */
export const ATENDENTE_CELULAR = "Respondida pelo celular (sem identificação)";
export const ATENDENTE_SEM_RESPOSTA = "Sem resposta da equipe";
/** Rótulo do atendente a partir do id da última resposta humana já escolhida (pessoa com nome vence o celular). */
export const rotuloAtendente = (userId: string | null | undefined, nome: string | null | undefined): string =>
  userId === ID_CELULAR ? ATENDENTE_CELULAR : (nome && String(nome).trim()) || ATENDENTE_SEM_RESPOSTA;

/** Rótulo usado antes; filtros já gravados com ele continuam valendo. */
export const ROTULO_VAZIO_ANTIGO = "Não definido";

export const rotuloDimensao = (v: unknown): string => {
  if (v == null) return NAO_DEFINIDO;
  const s = String(v).trim();
  return s ? s : NAO_DEFINIDO;
};

/** Valor de filtro gravado com o rótulo antigo vira o atual. */
export const normalizarRotuloVazio = (v: string): string => (v === ROTULO_VAZIO_ANTIGO ? NAO_DEFINIDO : v);
export function normalizarValoresFiltro<T extends string | string[] | undefined | null>(f: T): T {
  if (f == null) return f;
  return (Array.isArray(f) ? f.map(normalizarRotuloVazio) : normalizarRotuloVazio(f as string)) as T;
}
