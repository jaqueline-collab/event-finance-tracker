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
describe("conferência de janela maior", () => {
  it("30 dias terminam hoje", () => {
    const d = diasConferencia(Date.parse("2026-11-19T01:00:00Z"), 30);
    expect(d).toHaveLength(30);
    expect(d[0]).toBe("2026-10-20");
    expect(d[29]).toBe("2026-11-18");
  });
});

import { decidirExclusao, ehNaoEncontrado } from "../conferencia";
describe("cards excluídos no Elora", () => {
  it("só 'não encontrado' confirma exclusão; permissão e outros erros não", () => {
    expect(ehNaoEncontrado(500, { key: "ENTITY_NOT_FOUND" })).toBe(true);
    expect(ehNaoEncontrado(404, { key: "ENTITY_NOT_FOUND" })).toBe(true);
    expect(ehNaoEncontrado(403, { key: "ENTITY_NOT_FOUND" })).toBe(false);
    expect(ehNaoEncontrado(500, { key: "INTERNAL" })).toBe(false);
    expect(ehNaoEncontrado(200, { id: "x" })).toBe(false);
  });
  it("rodada incompleta ou com erro não marca nada", () => {
    expect(decidirExclusao(["a"], 1000, false).marcar).toEqual([]);
  });
  it("até 10 cards e até 2% da janela marca", () => {
    expect(decidirExclusao(["a", "b"], 1000, true)).toEqual({ marcar: ["a", "b"], bloqueado: false, motivo: null });
  });
  it("mais de 10 cards bloqueia todos e avisa", () => {
    const ids = Array.from({ length: 11 }, (_, i) => `c${i}`);
    const r = decidirExclusao(ids, 100000, true);
    expect(r.marcar).toEqual([]);
    expect(r.bloqueado).toBe(true);
    expect(r.motivo).toMatch(/revisão manual/);
  });
  it("mais de 2% da janela bloqueia todos", () => {
    const r = decidirExclusao(["a", "b", "c"], 100, true);
    expect(r.marcar).toEqual([]);
    expect(r.bloqueado).toBe(true);
    expect(decidirExclusao(["a", "b"], 100, true).marcar).toEqual(["a", "b"]);
  });
});

import { decidirRetomada, somarCardsPorDia } from "../conferencia";
describe("retomada e cards em lote", () => {
  const agora = Date.parse("2026-11-19T12:00:00Z");
  it("rodada 3h depois retoma a conferência aberta", () => expect(decidirRetomada({ situacao: "conferindo", created_at: "2026-11-19T09:00:00Z" }, agora)).toBe("retomar"));
  it("aberta há mais de 24h é interrompida", () => expect(decidirRetomada({ situacao: "conferindo", created_at: "2026-11-18T11:00:00Z" }, agora)).toBe("interromper"));
  it("sem aberta, começa outra", () => expect(decidirRetomada({ situacao: "concluida", created_at: "2026-11-19T09:00:00Z" }, agora)).toBe("nova"));
  it("cards vão para o dia de Brasília, sem repetir id", () => {
    const porDia: Record<string, number> = {}; const vistos = new Set<string>();
    somarCardsPorDia(porDia, vistos, [{ id: "a", createdAt: "2026-11-14T02:30:00Z" }, { id: "b", createdAt: "2026-11-14T03:30:00Z" }, { id: "a", createdAt: "2026-11-14T02:30:00Z" }], ["2026-11-13", "2026-11-14"]);
    expect(porDia).toEqual({ "2026-11-13": 1, "2026-11-14": 1 });
  });
});
