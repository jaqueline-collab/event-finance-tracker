type MovimentoContatos = {
  data: string;
  tipo: string;
  plano_id?: string | null;
  contatos_ativos?: number | null;
};

/** Limite de exibição: franquia + ajustes explícitos, nunca o uso atual ou o Setup. */
export function contatosContratados(
  inclusos: number | null | undefined,
  planoId: string | null | undefined,
  movimentos: readonly MovimentoContatos[],
): number {
  let adicionais = 0;
  let planoAnterior: string | null | undefined;
  for (const m of [...movimentos].sort((a, b) => a.data.localeCompare(b.data))) {
    if (m.tipo === "setup") {
      adicionais = 0;
      planoAnterior = m.plano_id;
      continue;
    }
    if (!["upgrade", "downgrade", "alterar_plano"].includes(m.tipo)) continue;
    if (m.plano_id && m.plano_id !== planoAnterior) {
      adicionais = 0;
      planoAnterior = m.plano_id;
    }
    if (m.contatos_ativos != null) adicionais = Math.max(0, adicionais + m.contatos_ativos);
  }
  if (planoAnterior && planoAnterior !== planoId) adicionais = 0;
  return Math.max(0, inclusos ?? 0) + adicionais;
}