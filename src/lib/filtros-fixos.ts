/**
 * Filtros fixos (regras puras). O filtro fixo do bloco é `cartao.filtros`; o da visão fica em
 * `elora_dashboard_visoes.filtros.filtrosFixos`. O servidor sempre usa a versão gravada, então quem vê
 * não consegue tirar um filtro fixo mandando outro cartão; os filtros de quem vê entram por cima.
 */
import { filtroCampoSchema, type FiltroCampo } from "./campos-elora";
import type { CartaoGrafico } from "./graficos";

export function filtrosFixosValidos(v: unknown): FiltroCampo[] {
  return Array.isArray(v) ? v.filter((f) => filtroCampoSchema.safeParse(f).success) as FiltroCampo[] : [];
}

type VisaoGravada = { id: string; cartoes: CartaoGrafico[]; filtrosFixos: FiltroCampo[] };

/**
 * Troca os filtros de cada cartão pelos gravados e soma o filtro fixo da visão antes dos de quem vê.
 * Cartão que não está gravado (prévia da super admin) segue como veio.
 */
export function aplicarFixosGravados(cartoes: CartaoGrafico[], visoes: VisaoGravada[], quemVe: FiltroCampo[]): { cartoes: CartaoGrafico[]; filtrosVisao: FiltroCampo[]; fixosVisao: FiltroCampo[] } {
  const visao = visoes.find((v) => cartoes.some((c) => v.cartoes.some((g) => g.id === c.id)));
  const salvos = new Map((visao?.cartoes ?? []).map((g) => [g.id, g]));
  const fixosVisao = visao?.filtrosFixos ?? [];
  return {
    cartoes: cartoes.map((c) => { const g = salvos.get(c.id); return g ? { ...c, filtros: g.filtros } : c; }),
    filtrosVisao: [...fixosVisao, ...quemVe],
    fixosVisao,
  };
}

/** Texto do selo com cadeado: "Atendente: Vinicius". */
export function textoSelo(f: FiltroCampo, rotulo?: string): string {
  const nome = rotulo || f.campo.replace(/^campo\./, "").replace(/[_-]+/g, " ").replace(/^./, (x) => x.toUpperCase());
  const vals = (f as any).valores as string[] | undefined;
  const op = (f as any).operador as string | undefined;
  const v = vals?.length ? vals.join(", ") : (f as any).valor != null ? String((f as any).valor) : "";
  if (op === "vazio") return `${nome}: sem informação`;
  if (op === "preenchido") return `${nome}: preenchido`;
  if (op && /^(nao|não|diferente)/.test(op)) return `${nome}: exceto ${v}`;
  return v ? `${nome}: ${v}` : nome;
}
