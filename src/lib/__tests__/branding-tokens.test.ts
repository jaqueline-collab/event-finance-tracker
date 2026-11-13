import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return n === "landing" || n === "__tests__" ? [] : arquivos(p);
    return p.endsWith(".tsx") ? [p] : [];
  });
}
// Telas internas e componentes base; site público (landing/blog) fica fora.
const PUBLICAS = /routes[\\/](index|blog|faq|simulador|funcionalidades|sobre|politica|termos)/;
const PROIBIDO = /(["'\s])(#[0-9a-fA-F]{6}\b|text-white\b|bg-white\b|bg-black\b|text-black\b)/;

describe("branding: só tokens", () => {
  it("telas internas não usam cor fora dos tokens", () => {
    const ruins = arquivos("src").filter((f) => !PUBLICAS.test(f)).filter((f) => PROIBIDO.test(readFileSync(f, "utf8")));
    expect(ruins).toEqual([]);
  });
  it("cores oficiais definidas", () => {
    const css = readFileSync("src/styles.css", "utf8");
    for (const c of ["#0A1F44", "#FFCC1F", "#0B0D12", "#F5F6F8", "Plus Jakarta Sans"]) expect(css).toContain(c);
  });
});
