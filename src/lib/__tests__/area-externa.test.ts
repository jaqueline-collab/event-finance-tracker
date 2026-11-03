import { describe, it, expect } from "vitest";
import { mostrarEsqueletoArea, itensFinanceiroParceiro } from "@/lib/area-externa";

describe("áreas externas", () => {
  it("esqueleto só antes da primeira leitura", () => {
    expect(mostrarEsqueletoArea(false)).toBe(true);
    expect(mostrarEsqueletoArea(true)).toBe(false);
  });
  it("Financeiro do parceiro só aparece com permissão de fechamentos", () => {
    expect(itensFinanceiroParceiro(false)).toEqual([]);
    expect(itensFinanceiroParceiro(true)).toEqual(["fechamentos", "relatorios", "notas"]);
  });
});
