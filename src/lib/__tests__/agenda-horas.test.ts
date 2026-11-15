import { describe, expect, it } from "vitest";
import { reguaHoras, type EventoCalendario } from "@/lib/graficos";

const ev = (id: string, hora: string, dia = "2026-11-10", tipo = 0): EventoCalendario => ({ id, dia, tipo, nome: id, hora });

describe("Agenda por hora", () => {
  it("11:30 fica entre as linhas de 11h e 12h", () => {
    const r = reguaHoras([ev("a", "09:00"), ev("b", "11:30"), ev("c", "14:00")]);
    const b = r.posicoes.find((p) => p.e.id === "b")!;
    expect(r.inicio).toBe(9);
    expect(b.pos).toBe(2.5);
  });
  it("horários iguais no mesmo dia ficam lado a lado", () => {
    const r = reguaHoras([ev("a", "10:00"), ev("b", "10:00"), ev("c", "10:00", "2026-11-11")]);
    const a = r.posicoes.find((p) => p.e.id === "a")!, b = r.posicoes.find((p) => p.e.id === "b")!, c = r.posicoes.find((p) => p.e.id === "c")!;
    expect([a.colunas, b.colunas, c.colunas]).toEqual([2, 2, 1]);
    expect([a.coluna, b.coluna]).toEqual([0, 1]);
  });
  it("intervalo de horas segue os compromissos do período", () => {
    const r = reguaHoras([ev("a", "07:15"), ev("b", "19:45")]);
    expect(r.horas[0]).toBe(7);
    expect(r.horas[r.horas.length - 1]).toBe(20);
  });
  it("compromisso sem horário fica fora da régua", () => {
    const r = reguaHoras([ev("a", ""), ev("b", "08:00")]);
    expect(r.semHora.map((e) => e.id)).toEqual(["a"]);
    expect(r.posicoes).toHaveLength(1);
  });
});
