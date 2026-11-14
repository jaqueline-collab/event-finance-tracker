/**
 * Lê todas as linhas de uma consulta ordenada, em páginas de 1000, várias páginas
 * ao mesmo tempo (resultado na mesma ordem da leitura página a página).
 */
export async function lerTudo(q: () => any, paralelo = 6): Promise<any[]> {
  const pagina = async (i: number) => {
    const { data, error } = await q().range(i * 1000, i * 1000 + 999);
    if (error) throw new Error(error.message);
    return (data ?? []) as any[];
  };
  const out: any[] = [];
  const primeira = await pagina(0);
  out.push(...primeira);
  if (primeira.length < 1000) return out;
  for (let n = 1; ; n += paralelo) {
    const lote = await Promise.all(Array.from({ length: paralelo }, (_, k) => pagina(n + k)));
    for (const l of lote) {
      out.push(...l);
      if (l.length < 1000) return out;
    }
  }
}
