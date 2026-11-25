import { NAO_DEFINIDO } from "./nao-definido";

/** Configuração por cliente: qual campo é a Origem e quais valores são patrocinados. */
export type OrigemPatrocinado = { campo: string; patrocinados: string[] };

const norm = (v: unknown) => String(v ?? "").trim().toLocaleLowerCase("pt-BR");

/** Aceita só a forma conhecida; qualquer outra coisa equivale a configuração vazia. */
export function origemPatrocinadoValida(v: unknown): OrigemPatrocinado | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const x = v as { campo?: unknown; patrocinados?: unknown };
  const campo = typeof x.campo === "string" ? x.campo.trim() : "";
  if (!campo || campo.length > 200 || !Array.isArray(x.patrocinados)) return null;
  const patrocinados = [...new Set(x.patrocinados.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter((v) => v && v.length <= 200 && v !== NAO_DEFINIDO))].slice(0, 300);
  return { campo, patrocinados };
}

/** Vazio, valor novo e valor não classificado são sempre não patrocinados. */
export function ehOrigemPatrocinada(valor: unknown, config: OrigemPatrocinado | null): boolean {
  if (!config) return false;
  const patrocinados = new Set(config.patrocinados.map(norm));
  const valores = Array.isArray(valor) ? valor : [valor];
  return valores.some((v) => {
    const n = norm(v);
    return n.length > 0 && patrocinados.has(n);
  });
}

/** Condição gravada na coluna: a lista é resolvida na leitura, não congelada na coluna. */
export function condicaoOrigemPatrocinado(campo: string, patrocinado: boolean) {
  return {
    campo: { fonte: "contato" as const, campo },
    operador: patrocinado ? ("em" as const) : ("nao_em" as const),
    lista: "origem_patrocinado" as const,
  };
}
