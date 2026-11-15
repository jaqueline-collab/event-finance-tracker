/** Regras puras das colunas preenchidas à mão (quem preenche, dia futuro, formato). */
export type QuemPreenche = "cliente" | "parceiro" | "super_admin";
export const ROTULO_QUEM_PREENCHE: Record<QuemPreenche, string> = { cliente: "Cliente", parceiro: "Parceiro", super_admin: "Só super admin" };
export type Papel = { superAdmin: boolean; cliente: boolean; parceiro: boolean };

/** Super admin sempre pode; "cliente" libera o cliente; "parceiro" libera o parceiro (e o cliente não). */
export function podePreencher(quem: QuemPreenche, p: Papel): boolean {
  if (p.superAdmin) return true;
  if (quem === "cliente") return p.cliente;
  if (quem === "parceiro") return p.parceiro;
  return false;
}

/** Dia futuro (em relação a hoje em Brasília) só quando a coluna aceita. */
export function diaPermitido(dia: string, hoje: string, aceitaFuturo: boolean): boolean {
  return aceitaFuturo || dia <= hoje;
}

export type FormatoManual = "inteiro" | "decimal" | "moeda";
export function formatoManual(formato: string | null | undefined): FormatoManual {
  return formato === "moeda" ? "moeda" : formato === "decimal" || formato === "percentual" ? "decimal" : "inteiro";
}

/** Texto digitado → número; vazio = null (vazio não é zero). Erro com mensagem clara. */
export function lerNumeroManual(t: string, f: FormatoManual): { ok: true; valor: number | null } | { ok: false; erro: string } {
  const s = t.trim().replace(/^R\$\s*/, "");
  if (s === "") return { ok: true, valor: null };
  const norm = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  if (!/^-?\d+(\.\d+)?$/.test(norm)) return { ok: false, erro: "Digite só números." };
  const n = Number(norm);
  if (f === "inteiro" && !Number.isInteger(n)) return { ok: false, erro: "Esta coluna aceita só números inteiros." };
  if (f === "moeda" && Math.round(n * 100) !== n * 100) return { ok: false, erro: "Use no máximo 2 casas decimais." };
  return { ok: true, valor: n };
}

/** Hoje (AAAA-MM-DD) em Brasília. */
export const hojeSP = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
