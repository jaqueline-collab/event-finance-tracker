/**
 * Páginas do menu lateral da Área do cliente. "conta" continua sendo o Painel
 * (valor usado em links antigos); a página "Conta" usa "plano".
 */
export const ABAS_AREA_CLIENTE = ["conta", "plano", "equipe", "treinamento", "novidades"] as const;
export type AbaAreaCliente = (typeof ABAS_AREA_CLIENTE)[number];

export function abaAreaCliente(valor: unknown): AbaAreaCliente {
  return (ABAS_AREA_CLIENTE as readonly string[]).includes(String(valor))
    ? (valor as AbaAreaCliente)
    : "conta";
}
