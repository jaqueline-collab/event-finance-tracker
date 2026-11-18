import { describe, expect, it } from "vitest";
import { ORDEM_RODADA, prazoDaFonte, rodarTodas } from "../sync-orquestrador.server";
import { iniciarCursorMensagens, SOBREPOSICAO_MENSAGENS_MS } from "../elora-espelho.server";

describe("rodada de sincronização", () => {
  it("cards roda antes de mensagens e sempre tem vez", async () => {
    const chamadas: string[] = [];
    const rodar = async (_db: any, _c: string, f: any, _ctx: any, prazo: number) => {
      chamadas.push(f);
      expect(prazo).toBeGreaterThanOrEqual(2_000);
      return { fonte: f, concluido: f !== "mensagens", registros: 1 };
    };
    const gravadas: string[] = [];
    await rodarTodas({} as any, "c", {} as any, 60_000, rodar as any, (async (_d: any, _c: string, r: any) => { gravadas.push(`${r.fonte}:${r.situacao}`); }) as any);
    expect(chamadas).toEqual(["apoio", "contatos", "atendimentos", "cards", "mensagens"]);
    expect(gravadas).toContain("cards:concluida");
    expect(gravadas).toContain("mensagens:em_andamento");
  });
  it("uma fonte nunca invade a reserva das seguintes", () => {
    expect(prazoDaFonte(ORDEM_RODADA.indexOf("cards"), 12_000)).toBe(8_000);
    expect(prazoDaFonte(ORDEM_RODADA.indexOf("mensagens"), 30_000)).toBe(30_000);
  });
});

describe("cursor de mensagens", () => {
  it("recomeça da última conclusão menos 2 horas", () => {
    const c = iniciarCursorMensagens({}, "2026-11-15T20:49:47.000Z", new Date("2026-11-17T00:00:00Z"));
    expect(SOBREPOSICAO_MENSAGENS_MS).toBe(2 * 3_600_000);
    expect(c.desde).toBe("2026-11-15T18:49:47.000Z");
    expect(c.ate).toBe("2026-11-17T00:00:00.000Z");
  });
  it("rodada em andamento mantém lista congelada e posição pelo id", () => {
    const salvo = { v: 2, desde: "a", ate: "2026-11-16T00:00:00Z", depoisDe: "sess-9", pagina: 1 };
    const c = iniciarCursorMensagens(salvo, null, new Date("2026-11-17T00:00:00Z"));
    expect(c.ate).toBe("2026-11-16T00:00:00Z");
    expect(c.depoisDe).toBe("sess-9");
  });
});

import { desdeIncremental } from "../sync-fontes";
describe("contatos incrementais", () => {
  it("contatos recomeçam 2 h antes da última conclusão", () => {
    expect(desdeIncremental("contatos", "2026-11-18T10:00:00.000Z")).toBe("2026-11-18T08:00:00.000Z");
  });
  it("atendimentos continuam voltando 3 dias", () => {
    expect(desdeIncremental("atendimentos", "2026-11-18T10:00:00.000Z")).toBe("2026-11-15T10:00:00.000Z");
  });
});
