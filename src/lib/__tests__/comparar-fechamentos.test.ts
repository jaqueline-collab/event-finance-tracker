import { describe, expect, it } from "vitest";
import { compararFechamentos, type FechamentoParceiro } from "../parceiro.financeiro";

const fech = (id: string, linhas: [string, number][]): FechamentoParceiro => ({
  id, competencia: id, titulo: id, enviadoEm: "", cicloInicio: null, cicloFim: null, vencimento: null,
  vencimentosDivergentes: false, vencimentos: [], notaId: null,
  linhas: linhas.map(([c, v], i) => ({
    id: `${id}${i}`, clienteId: c, clienteNome: c.toUpperCase(), planoNome: null, cicloInicio: null,
    cicloFim: null, vencimento: null, status: null, valorBruto: v, valorDesconto: 0, valorLiquido: v, composicao: [],
  })),
  totalBruto: linhas.reduce((s, [, v]) => s + v, 0), totalDesconto: 0,
  totalLiquido: linhas.reduce((s, [, v]) => s + v, 0),
});

describe("compararFechamentos", () => {
  it("classifica novo, saiu, aumentou, reduziu e igual", () => {
    const r = compararFechamentos(
      fech("a", [["x", 100], ["y", 200], ["z", 50], ["w", 10]]),
      fech("b", [["x", 130], ["y", 150], ["w", 10], ["n", 70]]),
    );
    const s = Object.fromEntries(r.linhas.map((l) => [l.clienteId, l.situacao]));
    expect(s).toEqual({ x: "aumentou", y: "reduziu", z: "saiu", w: "igual", n: "novo" });
    expect(r.diferenca).toBe(0);
    expect(r.clientesA).toBe(4);
    expect(r.clientesB).toBe(4);
  });
});
