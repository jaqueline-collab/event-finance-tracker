import { describe, expect, it } from "vitest";
import { conferenciaVencida, diasConferencia, divergencias, estadoCelula, limitesDia, totais } from "../conferencia";

describe("conferência com o Elora App", () => {
  it("dia de Brasília vai das 03:00 às 03:00 UTC", () => {
    expect(limitesDia("2026-11-16")).toEqual({ de: "2026-11-16T03:00:00.000Z", ate: "2026-11-17T03:00:00.000Z" });
  });
  it("últimos 7 dias incluem hoje no fuso de Brasília", () => {
    const d = diasConferencia(Date.parse("2026-11-19T01:00:00Z")); // 18/11 22:00 em Brasília
    expect(d).toHaveLength(7);
    expect(d[6]).toBe("2026-11-18");
    expect(d[0]).toBe("2026-11-12");
  });
  it("diferença zero é verde", () => expect(estadoCelula({ nosso: 5, elora: 5 }, false)).toBe("ok"));
  it("diferença de 1 hoje é em andamento", () => expect(estadoCelula({ nosso: 5, elora: 6 }, true)).toBe("andamento"));
  it("diferença de 1 em dia fechado é vermelha", () => expect(estadoCelula({ nosso: 5, elora: 6 }, false)).toBe("diverge"));
  it("diferença de 2 hoje é vermelha", () => expect(estadoCelula({ nosso: 5, elora: 7 }, true)).toBe("diverge"));
  it("total soma os dias", () => {
    const t = totais([{ dia: "a", cards: { nosso: 23, elora: 22 } }, { dia: "b", cards: { nosso: 1, elora: 1 } }]);
    expect(t.cards).toEqual({ nosso: 24, elora: 23 });
  });
  it("lista dia e coluna divergentes", () => {
    expect(divergencias([{ dia: "2026-11-16", cards: { nosso: 23, elora: 22 }, contatos: { nosso: 1, elora: 1 } }], "2026-11-18")).toEqual([{ dia: "2026-11-16", coluna: "cards" }]);
  });
  it("vence uma vez por dia, depois das 02:55 de Brasília", () => {
    const agora = Date.parse("2026-11-18T06:00:00Z"); // 03:00 em Brasília
    expect(conferenciaVencida("2026-11-18T05:50:00Z", agora)).toBe(true);
    expect(conferenciaVencida("2026-11-18T05:56:00Z", agora)).toBe(false);
    expect(conferenciaVencida("2026-11-18T05:50:00Z", Date.parse("2026-11-18T05:54:00Z"))).toBe(false);
    expect(conferenciaVencida(null, agora)).toBe(true);
  });
});
