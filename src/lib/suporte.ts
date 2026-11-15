/** Usuários de suporte (lista global): a pessoa nunca aparece para cliente/parceiro; a conversa continua contando. */
export type PessoaSuporte = { nome?: string | null; email?: string | null; telefone?: string | null };
const norm = (x: string | null | undefined) => (x ?? "").trim().toLowerCase();
/** Telefone só pelos dígitos, sem o 55 do Brasil, para "21995501331" e "+55 (21) 99550-1331" baterem. */
export const normTelefone = (x: string | null | undefined) => {
  const d = (x ?? "").replace(/\D/g, "");
  return d.length > 11 && d.startsWith("55") ? d.slice(2) : d;
};
export function criarEhSuporte(lista: PessoaSuporte[]) {
  const nomes = new Set(lista.map((p) => norm(p.nome)).filter(Boolean));
  const emails = new Set(lista.map((p) => norm(p.email)).filter(Boolean));
  const fones = new Set(lista.map((p) => normTelefone(p.telefone)).filter((t) => t.length >= 8));
  return (nome?: string | null, email?: string | null, telefone?: string | null) =>
    (!!norm(nome) && nomes.has(norm(nome))) || (!!norm(email) && emails.has(norm(email))) || (normTelefone(telefone).length >= 8 && fones.has(normTelefone(telefone)));
}
/** Nome que pode ser mostrado: vazio quando é usuário de suporte. */
export const nomeVisivel = (eh: ReturnType<typeof criarEhSuporte>, nome?: string | null, email?: string | null, telefone?: string | null) =>
  nome && !eh(nome, email, telefone) ? nome : null;
/** Dados de um usuário da conta (apoio "usuario") para reconhecer suporte por nome, e-mail ou telefone. */
export const dadosUsuario = (a: { nome?: string | null; payload?: any }) => ({
  nome: a.nome ?? a.payload?.name ?? null,
  email: a.payload?.email ?? null,
  telefone: a.payload?.phone ?? a.payload?.phoneNumber ?? a.payload?.cellPhone ?? null,
});
