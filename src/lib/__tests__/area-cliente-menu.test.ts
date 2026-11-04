import { describe, expect, it } from "vitest";
import { abaAreaCliente } from "../area-cliente-menu";

describe("abaAreaCliente", () => {
  it("link antigo ?aba=conta continua abrindo o Painel", () => {
    expect(abaAreaCliente("conta")).toBe("conta");
  });
  it("Conta e Minha equipe são páginas próprias do menu", () => {
    expect(abaAreaCliente("plano")).toBe("plano");
    expect(abaAreaCliente("equipe")).toBe("equipe");
  });
  it("valor desconhecido cai no Painel", () => {
    expect(abaAreaCliente("xyz")).toBe("conta");
    expect(abaAreaCliente(undefined)).toBe("conta");
  });
});
