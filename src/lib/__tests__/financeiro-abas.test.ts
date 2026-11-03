import { describe, expect, it } from "vitest";
import { abasPermitidas, resolverAba } from "../financeiro-abas";

describe("abas do Financeiro", () => {
  it("só Fechamento Mensal libera apenas a aba Fechamento", () => {
    expect(abasPermitidas((m) => m === "resumo")).toEqual(["fechamento"]);
  });
  it("só Financeiro libera Lançamentos e Notas fiscais", () => {
    expect(abasPermitidas((m) => m === "financeiro")).toEqual(["lancamentos", "notas"]);
  });
  it("link para aba sem permissão abre a primeira permitida", () => {
    expect(resolverAba("fechamento", ["lancamentos", "notas"])).toBe("lancamentos");
  });
  it("link para aba permitida abre ela", () => {
    expect(resolverAba("notas", ["fechamento", "lancamentos", "notas"])).toBe("notas");
  });
  it("sem nenhuma permissão não abre aba", () => {
    expect(resolverAba(undefined, [])).toBeNull();
  });
});
