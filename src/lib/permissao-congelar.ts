/** A autorização é consultada no servidor com o cliente autenticado, nunca pelo navegador. */
export async function podeCongelarRelatorio(db: { rpc: (nome: "is_admin") => PromiseLike<{ data: unknown; error?: unknown }> }): Promise<boolean> {
  const { data, error } = await db.rpc("is_admin");
  return !error && data === true;
}