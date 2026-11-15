import { describe, expect, it } from "vitest";
import { DURACAO_PADRAO_MIN, inicioDaSemana, reguaHoras, resumoDiaMes, type EventoCalendario } from "@/lib/graficos";

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
    // 19:45 + 30 min padrão termina 20:15, então a régua vai até 21h
    expect(r.horas[r.horas.length - 1]).toBe(21);
  });
  it("compromisso sem horário fica fora da régua", () => {
    const r = reguaHoras([ev("a", ""), ev("b", "08:00")]);
    expect(r.semHora.map((e) => e.id)).toEqual(["a"]);
    expect(r.posicoes).toHaveLength(1);
  });

  it("sem duração, o bloco tem 30 minutos; com duração, a altura dela", () => {
    expect(DURACAO_PADRAO_MIN).toBe(30);
    const r = reguaHoras([ev("a", "09:00"), { ...ev("b", "10:00"), duracaoMin: 90 }]);
    expect(r.posicoes.find((p) => p.e.id === "a")!.duracao).toBe(0.5);
    expect(r.posicoes.find((p) => p.e.id === "b")!.duracao).toBe(1.5);
  });
  it("compromissos que se sobrepõem ficam lado a lado; os que não se tocam, largura inteira", () => {
    const r = reguaHoras([ev("a", "09:00"), ev("b", "09:15"), ev("c", "10:00")]);
    const by = (id: string) => r.posicoes.find((p) => p.e.id === id)!;
    expect([by("a").colunas, by("b").colunas, by("c").colunas]).toEqual([2, 2, 1]);
  });
  it("semana começa no domingo; com a opção do cliente, na segunda", () => {
    expect(inicioDaSemana("2026-11-12")).toBe("2026-11-08"); // quinta → domingo
    expect(inicioDaSemana("2026-11-12", true)).toBe("2026-11-09");
    expect(inicioDaSemana("2026-11-08", true)).toBe("2026-11-02"); // domingo → segunda anterior
  });
  it("mês mostra até 3 por dia e o resto como +N mais", () => {
    expect(resumoDiaMes([1, 2, 3])).toEqual({ mostrar: [1, 2, 3], mais: 0 });
    expect(resumoDiaMes([1, 2, 3, 4, 5])).toEqual({ mostrar: [1, 2], mais: 3 });
  });
});
