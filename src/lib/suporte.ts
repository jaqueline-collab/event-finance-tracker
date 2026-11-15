/** Usuários de suporte (lista global): a pessoa nunca aparece para cliente/parceiro; a conversa continua contando. */
export type PessoaSuporte = { nome?: string | null; email?: string | null };
const norm = (x: string | null | undefined) => (x ?? "").trim().toLowerCase();
export function criarEhSuporte(lista: PessoaSuporte[]) {
  const nomes = new Set(lista.map((p) => norm(p.nome)).filter(Boolean));
  const emails = new Set(lista.map((p) => norm(p.email)).filter(Boolean));
  return (nome?: string | null, email?: string | null) => (!!norm(nome) && nomes.has(norm(nome))) || (!!norm(email) && emails.has(norm(email)));
}
/** Nome que pode ser mostrado: vazio quando é usuário de suporte. */
export const nomeVisivel = (eh: ReturnType<typeof criarEhSuporte>, nome?: string | null, email?: string | null) => (nome && !eh(nome, email) ? nome : null);
