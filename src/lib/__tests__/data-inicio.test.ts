import { describe, it, expect } from "vitest";
import { competenciasQueMudam, incluidoNaCompetencia, proximoVencimentoMantendoDia } from "../calc/data-inicio";
import type { Cliente } from "../types";

const cli = (over: Partial<Cliente> = {}) =>
  ({ id: "x", nome: "Teste", planoId: null, dataInicio: "2026-10-20", dataVencimento: "2026-11-19", dataChurn: null, ...over } as unknown as Cliente);

describe("alteração da data de início", () => {
  it("20/10 → 01/11 tira o cliente da competência de outubro", () => {
    expect(incluidoNaCompetencia(cli(), undefined, "2026-10")).toBe(true);
    expect(incluidoNaCompetencia(cli({ dataInicio: "2026-11-01" }), undefined, "2026-10")).toBe(false);
    expect(competenciasQueMudam(cli(), undefined, "2026-11-01", ["2026-10", "2026-11"])).toEqual([
      { competencia: "2026-10", antes: true, depois: false },
    ]);
  });

  it("antecipar a data faz o cliente entrar em competência anterior", () => {
    expect(competenciasQueMudam(cli(), undefined, "2026-09-15", ["2026-09"])).toEqual([
      { competencia: "2026-09", antes: false, depois: true },
    ]);
  });

  it("mesma competência não muda nada", () => {
    expect(competenciasQueMudam(cli(), undefined, "2026-10-05", ["2026-10", "2026-11"])).toEqual([]);
  });

  it("mantém o dia de vencimento do cliente: dia 19 → 19/11/2026", () => {
    expect(proximoVencimentoMantendoDia("2026-11-01", "2026-11-19")).toBe("2026-11-19");
    expect(proximoVencimentoMantendoDia("2026-11-01", "19")).toBe("2026-11-19");
  });

  it("se a nova data passa do dia, vence no mês seguinte com o mesmo dia", () => {
    expect(proximoVencimentoMantendoDia("2026-11-25", "2026-11-19")).toBe("2026-12-19");
  });
});
