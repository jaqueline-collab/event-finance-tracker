import { describe, expect, it } from "vitest";
import { abaDadosEloraValida, estadoIntegracao, formatarTelefoneBr } from "../dados-elora";

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
  it("aba inválida cai em visão geral", () => {
    expect(abaDadosEloraValida("xyz")).toBe("visao");
    expect(abaDadosEloraValida("canais")).toBe("canais");
  });
});
