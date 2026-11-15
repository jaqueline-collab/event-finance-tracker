/**
 * Rótulo curto de linha de agrupamento (canal, equipe, atendente, etiqueta, origem, campanha,
 * etapa, campo personalizado) quando o valor está vazio: a linha continua identificável e a soma fecha.
 * Em célula de item (tabela, lista do dia, detalhes, exportar) o vazio fica em branco.
 */
export const NAO_DEFINIDO = "Sem informação";
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
