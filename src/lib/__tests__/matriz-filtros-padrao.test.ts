import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { filtrosPadraoValidos } from "@/lib/campos-elora";

const fn = readFileSync("src/lib/matriz.functions.ts", "utf8");
const bloco = fn.slice(fn.indexOf("export const salvarFiltrosPadraoMatriz"));

describe("Matriz: filtros padrão", () => {
  it("só super admin grava (o servidor exige antes de escrever)", () => {
    expect(bloco.indexOf("exigirSuperAdmin")).toBeGreaterThan(-1);
    expect(bloco.indexOf("exigirSuperAdmin")).toBeLessThan(bloco.indexOf("upsert"));
  });
  it("padrão ausente = sem filtro; inválidos descartados", () => {
    expect(filtrosPadraoValidos(null)).toEqual([]);
    const ok = { fonte: "contato", campo: "origem", op: "em", valores: ["X"] };
    expect(filtrosPadraoValidos([ok, { fonte: "?", campo: 1 }])).toEqual([ok]);
  });
  it("a leitura devolve o padrão a todos que podem ver a Matriz", () => {
    const ler = fn.slice(fn.indexOf("export const lerMatriz"), fn.indexOf("export const previaColunaMatriz"));
    expect(ler).toContain("filtrosPadrao");
    expect(ler.indexOf("podeVer")).toBeLessThan(ler.indexOf("matriz_filtros_padrao"));
  });
});
