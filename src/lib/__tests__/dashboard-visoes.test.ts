import { describe, it, expect } from "vitest";
import { diffVisoes, mostrarBarraDeAbas, moverVisao, proximoNomeVisao, visoesVisiveis } from "@/lib/dashboard-visoes";

const v = (id: string, ordem: number, publicada: boolean, nome = id) => ({ id, nome, ordem, publicada });

describe("visões do painel", () => {
  it("quem não edita vê só as publicadas, em ordem", () => {
    const r = visoesVisiveis([v("b", 1, true), v("rasc", 0, false), v("a", 0, true)], false);
    expect(r.map((x) => x.id)).toEqual(["a", "b"]);
  });
  it("super admin em modo Editar vê também os rascunhos", () => {
    expect(visoesVisiveis([v("a", 0, true), v("r", 1, false)], true)).toHaveLength(2);
  });
  it("com uma visão só, não mostra barra de abas (fora do Editar)", () => {
    expect(mostrarBarraDeAbas(1, false)).toBe(false);
    expect(mostrarBarraDeAbas(2, false)).toBe(true);
    expect(mostrarBarraDeAbas(1, true)).toBe(true);
  });
  it("reordenar renumera a partir de 0", () => {
    const r = moverVisao([v("a", 0, true), v("b", 1, true), v("c", 2, true)], 2, 0);
    expect(r.map((x) => [x.id, x.ordem])).toEqual([["c", 0], ["a", 1], ["b", 2]]);
  });
  it("diff aponta criar, atualizar e excluir", () => {
    const salvas = [v("a", 0, true), v("b", 1, true)];
    const editadas = [v("b", 0, false), v("nova-1", 1, false)];
    const d = diffVisoes(salvas, editadas);
    expect(d.excluir).toEqual(["a"]);
    expect(d.criar.map((x) => x.id)).toEqual(["nova-1"]);
    expect(d.atualizar.map((x) => x.id)).toEqual(["b"]);
  });
  it("nome padrão não repete", () => {
    expect(proximoNomeVisao(["Resultados", "Visão 2"])).toBe("Visão 3");
  });
});
