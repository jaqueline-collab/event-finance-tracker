// Regras puras das Áreas do Parceiro e do Cliente (menu e carregamento).

/** O esqueleto só aparece antes da primeira leitura concluída; recargas mantêm o conteúdo. */
export function mostrarEsqueletoArea(jaCarregou: boolean): boolean {
  return !jaCarregou;
}

export type SubFinanceiroParceiro = "fechamentos" | "relatorios" | "notas";

/** Itens do grupo Financeiro do parceiro: só existem com permissão de ver fechamentos. */
export function itensFinanceiroParceiro(podeVerFechamentos: boolean): SubFinanceiroParceiro[] {
  return podeVerFechamentos ? ["fechamentos", "relatorios", "notas"] : [];
}
