/**
 * Valor ausente ou sem mapeamento em qualquer dimensão (canal, equipe, atendente,
 * etiqueta, origem, campanha, etapa, campo personalizado). Nunca bloqueia nada.
 */
export const NAO_DEFINIDO = "Não definido";

export const rotuloDimensao = (v: unknown): string => {
  if (v == null) return NAO_DEFINIDO;
  const s = String(v).trim();
  return s ? s : NAO_DEFINIDO;
};
