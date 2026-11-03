export type AbaFinanceiro = "fechamento" | "lancamentos" | "notas";

export const ABAS_FINANCEIRO: { key: AbaFinanceiro; label: string; modulo: "resumo" | "financeiro" }[] = [
  { key: "fechamento", label: "Fechamento mensal", modulo: "resumo" },
  { key: "lancamentos", label: "Lançamentos", modulo: "financeiro" },
  { key: "notas", label: "Notas fiscais", modulo: "financeiro" },
];

/** Abas visíveis conforme a permissão de módulo de cada uma. */
export function abasPermitidas(canView: (m: "resumo" | "financeiro") => boolean): AbaFinanceiro[] {
  return ABAS_FINANCEIRO.filter((a) => canView(a.modulo)).map((a) => a.key);
}

/** Aba a abrir: a pedida no link, se permitida; senão a primeira permitida; null se nenhuma. */
export function resolverAba(pedida: string | undefined, permitidas: AbaFinanceiro[]): AbaFinanceiro | null {
  if (pedida && (permitidas as string[]).includes(pedida)) return pedida as AbaFinanceiro;
  return permitidas[0] ?? null;
}
