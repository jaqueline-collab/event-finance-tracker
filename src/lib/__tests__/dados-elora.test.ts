import { describe, expect, it } from "vitest";
import { abaConfigurarDoEndereco, abaDadosEloraValida, estadoIntegracao, formatarTelefoneBr, podeConfigurarArea } from "../dados-elora";

describe("dados do elora", () => {
  it("formata celular com DDI", () => {
    expect(formatarTelefoneBr("5531990861102")).toBe("(31) 99086-1102");
  });
  it("formata celular sem DDI e fixo", () => {
    expect(formatarTelefoneBr("31990861102")).toBe("(31) 99086-1102");
    expect(formatarTelefoneBr("3132221111")).toBe("(31) 3222-1111");
  });
  it("sem número", () => {
    expect(formatarTelefoneBr(null)).toBe("sem número");
  });
  it("estado do chip", () => {
    expect(estadoIntegracao({ temChave: false, ultimoErro: "x" })).toBe("sem_chave");
    expect(estadoIntegracao({ temChave: true, ultimoErro: "401" })).toBe("com_erro");
    expect(estadoIntegracao({ temChave: true, ultimoErro: null })).toBe("conectado");
  });
  it("aba inválida cai em Conexão e Visão geral não existe mais", () => {
    expect(abaDadosEloraValida("xyz")).toBe("conexao");
    expect(abaDadosEloraValida("visao")).toBe("conexao");
    expect(abaDadosEloraValida("canais")).toBe("canais");
  });
  it("?configurar= abre só abas conhecidas", () => {
    expect(abaConfigurarDoEndereco("painel")).toBe("painel");
    expect(abaConfigurarDoEndereco("")).toBeNull();
    expect(abaConfigurarDoEndereco("visao")).toBeNull();
    expect(abaConfigurarDoEndereco("estrutura")).toBe("conexao");
    expect(abaDadosEloraValida("estrutura")).toBe("conexao");
  });
  it("modo configuração só para super admin vendo um cliente", () => {
    expect(podeConfigurarArea({ isAdmin: true, como: "cliente-teste" })).toBe(true);
    expect(podeConfigurarArea({ isAdmin: false, como: "cliente-teste" })).toBe(false);
    expect(podeConfigurarArea({ isAdmin: true, como: "  " })).toBe(false);
  });
});
