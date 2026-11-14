/**
 * Contexto de uma requisição: cada leitura pesada (catálogo, leituras de cards,
 * mensagens, painel, Matriz) acontece uma vez e é repartida entre os blocos.
 * Vive só durante a requisição; nunca guarda nada entre usuários.
 */
export type Ctx = {
  memo: <T>(chave: string, fn: () => Promise<T>) => Promise<T>;
  /** Faixa de mensagens já carregada (início/fim em UTC) para servir recortes menores. */
  msgs?: { inicio: string; fim: string; lista: Promise<any[]> };
};

export function criarContexto(): Ctx {
  const m = new Map<string, Promise<unknown>>();
  return {
    memo<T>(chave: string, fn: () => Promise<T>) {
      let p = m.get(chave) as Promise<T> | undefined;
      if (!p) {
        p = fn();
        m.set(chave, p);
        p.catch(() => m.delete(chave));
      }
      return p;
    },
  };
}

export const comMemo = <T>(ctx: Ctx | undefined, chave: string, fn: () => Promise<T>) => (ctx ? ctx.memo(chave, fn) : fn());
