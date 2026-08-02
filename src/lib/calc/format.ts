export function formatBRL(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Formata preços unitários pequenos (ex.: R$/contato) sem arredondar para 2
 * casas — 0,095 aparece como "R$ 0,095" e não como "R$ 0,10".
 */
export function formatBRLPreciso(n: number): string {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}