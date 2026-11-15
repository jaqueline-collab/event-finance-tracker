/**
 * Coluna "Status do lead" configurável por cliente (pura, testável).
 * A origem vem da configuração do cliente; nada fixo de cliente aqui.
 */
import { z } from "zod";

export const CAMPO_STATUS_LEAD = "status_lead";
export const ROTULO_STATUS_PADRAO = "Status do lead";
export const REGRA_STATUS_LEAD =
  "Se a linha for um contato ou um card de outro funil, usamos o card atualizado mais recentemente desse contato no funil escolhido; sem card nesse funil, a célula fica em branco.";

export const colunaStatusSchema = z.object({
  fonte: z.enum(["contato", "card"]),
  /** Funil (painel) do card; obrigatório quando a fonte é card. */
  funilId: z.string().max(80).nullable().optional(),
  /** Campo: no contato, qualquer campo do catálogo; no card, "etapa", "status" ou "campo.<chave>". */
  campo: z.string().min(1).max(200),
  rotulo: z.string().trim().max(60).optional(),
}).refine((c) => c.fonte === "contato" || !!c.funilId, { message: "escolha o funil" });
export type ColunaStatus = z.infer<typeof colunaStatusSchema>;

export const colunaStatusValida = (v: unknown): ColunaStatus | null => {
  const r = colunaStatusSchema.safeParse(v);
  return r.success ? r.data : null;
};
export const rotuloStatus = (c: ColunaStatus | null) => c?.rotulo?.trim() || ROTULO_STATUS_PADRAO;

type Contato = { id: string; status_lead?: string | null } & Record<string, any>;
type Card = { id: string; contato_ids: string[]; painel_id?: string | null; atualizado_em?: string | null; status_lead?: string | null } & Record<string, any>;

const texto = (v: unknown): string | null => {
  const l = (Array.isArray(v) ? v : [v]).filter((x) => x != null && !(typeof x === "string" && !x.trim()));
  if (!l.length) return null;
  return l.map((x) => (x && typeof x === "object" ? String((x as any).name ?? (x as any).value ?? "") : String(x))).filter(Boolean).join(", ") || null;
};

/** Lê um campo bruto do contato ou do card (mesmos nomes do catálogo). */
function ler(r: any, campo: string): unknown {
  if (!r) return null;
  if (campo.startsWith("campo.")) return r.cf?.[campo.slice(6)] ?? null;
  return r[campo] ?? null;
}

/**
 * Grava `status_lead` em cada contato e card, conforme a origem:
 * - contato: o campo do contato (card usa o do seu primeiro contato);
 * - card de um funil: card do próprio funil usa a si mesmo; contato e card de outro funil usam
 *   o card atualizado mais recentemente desse contato no funil; sem card ali, fica vazio.
 */
export function resolverStatusLead<C extends Contato, K extends Card>(contatos: C[], cards: K[], cfg: ColunaStatus | null): void {
  if (!cfg) return;
  if (cfg.fonte === "contato") {
    const m = new Map<string, string | null>();
    for (const c of contatos) { c.status_lead = texto(ler(c, cfg.campo)); m.set(c.id, c.status_lead); }
    for (const k of cards) k.status_lead = m.get(k.contato_ids?.[0] ?? "") ?? null;
    return;
  }
  const recente = new Map<string, K>();
  for (const k of cards) {
    if (k.painel_id !== cfg.funilId) continue;
    for (const id of k.contato_ids ?? []) {
      const a = recente.get(id);
      if (!a || String(k.atualizado_em ?? "") > String(a.atualizado_em ?? "")) recente.set(id, k);
    }
  }
  const valor = (k: K | undefined) => (k ? texto(ler(k, cfg.campo)) : null);
  for (const c of contatos) c.status_lead = valor(recente.get(c.id));
  for (const k of cards) k.status_lead = k.painel_id === cfg.funilId ? valor(k) : valor(recente.get(k.contato_ids?.[0] ?? ""));
}

/** Ordena rótulos pela ordem conhecida (ex.: etapas do funil); o que não está na lista vai depois, em ordem alfabética. */
export function ordenarPor<T>(lista: T[], ordem: string[] | undefined, rot: (x: T) => string): T[] {
  if (!ordem?.length) return lista;
  const pos = new Map(ordem.map((r, i) => [r, i]));
  return [...lista].sort((a, b) => {
    const pa = pos.get(rot(a)), pb = pos.get(rot(b));
    if (pa != null && pb != null) return pa - pb;
    if (pa != null) return -1;
    if (pb != null) return 1;
    return 0;
  });
}

/** Cor da etiqueta: estável por valor, sobre a paleta de gráficos da marca (pares fundo/texto com contraste AA). */
export const CORES_ETIQUETA = [
  "bg-chart-1 text-chart-1-foreground",
  "bg-chart-2 text-chart-2-foreground",
  "bg-chart-3 text-chart-3-foreground",
  "bg-chart-4 text-chart-4-foreground",
  "bg-chart-5 text-chart-5-foreground",
] as const;
export function corEtiqueta(valor: string, ordem?: string[]): string {
  const i = ordem?.indexOf(valor) ?? -1;
  if (i >= 0) return CORES_ETIQUETA[i % CORES_ETIQUETA.length];
  let h = 0;
  for (const ch of valor) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CORES_ETIQUETA[h % CORES_ETIQUETA.length];
}
