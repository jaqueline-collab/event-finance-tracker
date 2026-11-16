import { describe, expect, it } from "vitest";
import { cicloOrdem, compararValores } from "@/lib/colunas-tabela";

const ordenar = (l: string[], desc = false) => [...l].sort((a, b) => compararValores(a, b, desc));

describe("ordenar colunas", () => {
  it("clique alterna crescente, decrescente e padrão", () => {
    const p = { col: "total", desc: true };
    let o = cicloOrdem(p, "nome", p);
    expect(o).toEqual({ col: "nome", desc: false });
    o = cicloOrdem(o, "nome", p);
    expect(o).toEqual({ col: "nome", desc: true });
    expect(cicloOrdem(o, "nome", p)).toEqual(p);
  });
  it("na coluna do padrão (Dia mais recente primeiro) o clique inverte e depois volta", () => {
    const p = { col: "dia", desc: true };
    const o = cicloOrdem(p, "dia", p);
    expect(o).toEqual({ col: "dia", desc: false });
    expect(cicloOrdem(o, "dia", p)).toEqual(p);
  });
  it("datas ordenam pela data real, não pelo texto", () => {
    expect(ordenar(["02/11/2026", "15/10/2026", "01/12/2025"])).toEqual(["01/12/2025", "15/10/2026", "02/11/2026"]);
    expect(ordenar(["10/11/26 13:33", "10/11/26 09:05"])).toEqual(["10/11/26 09:05", "10/11/26 13:33"]);
  });
  it("números em reais, milhar e porcentagem ordenam pelo valor", () => {
    expect(ordenar(["R$ 1.200,00", "R$ 950,50", "R$ 10.000,00"])).toEqual(["R$ 950,50", "R$ 1.200,00", "R$ 10.000,00"]);
    expect(ordenar(["9,5%", "59,1%", "31,8%"], true)).toEqual(["59,1%", "31,8%", "9,5%"]);
    expect(ordenar(["1.025", "987", "2.425"])).toEqual(["987", "1.025", "2.425"]);
  });
  it("duração ordena pelo tempo", () => {
    expect(ordenar(["5d 13h", "19h 23min", "45min"])).toEqual(["45min", "19h 23min", "5d 13h"]);
  });
  it("vazio fica sempre por último", () => {
    expect(ordenar(["", "B", "A"])).toEqual(["A", "B", ""]);
    expect(ordenar(["", "1", "3"], true)).toEqual(["3", "1", ""]);
  });
});
