// Regras puras da configuração do cliente na Área do cliente (sem dependências de servidor).

export const ABAS_DADOS_ELORA = [
  { key: "conexao", label: "Conexão" },
  { key: "canais", label: "Canais" },
  { key: "estrutura", label: "Estrutura e campos" },
  { key: "painel", label: "Painel do cliente" },
] as const;

export type AbaDadosElora = (typeof ABAS_DADOS_ELORA)[number]["key"];

export function abaDadosEloraValida(v: unknown): AbaDadosElora {
  return ABAS_DADOS_ELORA.some((a) => a.key === v) ? (v as AbaDadosElora) : "conexao";
}

/** Aba do painel lateral pedida pelo endereço (?configurar=); null quando não deve abrir. */
export function abaConfigurarDoEndereco(v: unknown): AbaDadosElora | null {
  return ABAS_DADOS_ELORA.some((a) => a.key === v) ? (v as AbaDadosElora) : null;
}

/** Modo configuração: só super admin, e só quando está vendo um cliente escolhido (?como=). */
export function podeConfigurarArea(i: { isAdmin: boolean; como: string }): boolean {
  return i.isAdmin === true && i.como.trim().length > 0;
}

export type EstadoIntegracao = "conectado" | "sem_chave" | "com_erro";

export const ROTULO_ESTADO: Record<EstadoIntegracao, string> = {
  conectado: "Conectado",
  sem_chave: "Sem chave",
  com_erro: "Com erro",
};

/** Sem chave (nem no cofre nem na coluna antiga) → Sem chave; com último erro → Com erro; senão Conectado. */
export function estadoIntegracao(i: { temChave: boolean; ultimoErro: string | null | undefined }): EstadoIntegracao {
  if (!i.temChave) return "sem_chave";
  if (i.ultimoErro && i.ultimoErro.trim()) return "com_erro";
  return "conectado";
}

/** Formata número brasileiro: 5531990861102 → (31) 99086-1102. Outros formatos voltam como vieram. */
export function formatarTelefoneBr(numero: string | null | undefined): string {
  if (!numero) return "sem número";
  let d = numero.replace(/\D/g, "");
  if (d.length >= 12 && d.startsWith("55")) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return numero;
}
