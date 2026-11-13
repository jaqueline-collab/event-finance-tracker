/** Estado "super admin em modo Editar" da Área do cliente, lido pela Elora para mostrar o assistente. Só exibição: o servidor revalida. */
import { useSyncExternalStore } from "react";

type Estado = { clienteId: string; visaoId: string | null } | null;
let atual: Estado = null;
const ouvintes = new Set<() => void>();
export function definirModoEditar(e: Estado) {
  if (JSON.stringify(e) === JSON.stringify(atual)) return;
  atual = e;
  ouvintes.forEach((f) => f());
}
export function useModoEditar(): Estado {
  return useSyncExternalStore(
    (f) => { ouvintes.add(f); return () => ouvintes.delete(f); },
    () => atual,
    () => null,
  );
}
