/** Regra pura para não perder a data da classificação quando outro dado da conversa muda. */
export type ClassificacaoDatada = {
  externo_id: string;
  classificacao: string | null;
  classificado_em: string | null;
};

/** Mesma classificação conserva a primeira data recebida; classificação nova usa a nova data do Elora. */
export function preservarDataClassificacao<T extends ClassificacaoDatada>(novas: T[], antigas: ClassificacaoDatada[]): T[] {
  const antes = new Map(antigas.map((a) => [String(a.externo_id), a]));
  return novas.map((nova) => {
    const a = antes.get(String(nova.externo_id));
    if (a && a.classificacao === nova.classificacao && a.classificado_em) return { ...nova, classificado_em: a.classificado_em };
    return nova;
  });
}
