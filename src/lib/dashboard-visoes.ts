/**
 * Regras puras das visões do painel do cliente (abas do dash).
 * Sem acesso a banco: usadas no servidor e na tela.
 */

export type Visao = {
  id: string;
  nome: string;
  ordem: number;
  publicada: boolean;
  totalGraficos: number;
};

/** Visões que a pessoa pode ver: rascunhos só para quem edita (super admin). */
export function visoesVisiveis<T extends { publicada: boolean; ordem: number }>(
  visoes: T[],
  incluirRascunhos: boolean,
): T[] {
  return visoes
    .filter((v) => incluirRascunhos || v.publicada)
    .slice()
    .sort((a, b) => a.ordem - b.ordem);
}

/** Move um item de posição e renumera a ordem de 0 em diante. */
export function moverVisao<T extends { ordem: number }>(lista: T[], de: number, para: number): T[] {
  if (de === para || de < 0 || para < 0 || de >= lista.length || para >= lista.length) {
    return lista.map((v, i) => ({ ...v, ordem: i }));
  }
  const copia = lista.slice();
  const [item] = copia.splice(de, 1);
  copia.splice(para, 0, item);
  return copia.map((v, i) => ({ ...v, ordem: i }));
}

/** Barra de abas só aparece com mais de uma visão. */
export function mostrarBarraDeAbas(qtd: number, editando: boolean): boolean {
  return editando || qtd > 1;
}

/** Nome padrão para a próxima visão, sem repetir. */
export function proximoNomeVisao(existentes: string[]): string {
  const usados = new Set(existentes.map((n) => n.trim().toLowerCase()));
  let i = existentes.length + 1;
  while (usados.has(`visão ${i}`)) i++;
  return `Visão ${i}`;
}

/** Diferença entre o salvo e o editado: o que criar, atualizar e excluir. */
export function diffVisoes(
  salvas: { id: string; nome: string; ordem: number; publicada: boolean }[],
  editadas: { id: string; nome: string; ordem: number; publicada: boolean; novaDe?: string | null }[],
) {
  const idsEditados = new Set(editadas.map((v) => v.id));
  const porId = new Map(salvas.map((v) => [v.id, v]));
  const excluir = salvas.filter((v) => !idsEditados.has(v.id)).map((v) => v.id);
  const criar = editadas.filter((v) => !porId.has(v.id));
  const atualizar = editadas.filter((v) => {
    const s = porId.get(v.id);
    return s && (s.nome !== v.nome || s.ordem !== v.ordem || s.publicada !== v.publicada);
  });
  return { criar, atualizar, excluir };
}
