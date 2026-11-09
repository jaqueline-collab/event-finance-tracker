import { describe, expect, it } from "vitest";
import { rotuloFonte, ultimaRodada } from "../sync-fontes";

const base = { fonte: "contatos", registros: 11645, comErro: false, atualizadoEm: null };

describe("rótulo da fonte de sincronização", () => {
  it("concluída mostra data em São Paulo", () => {
    expect(
      rotuloFonte({ ...base, iniciadoEm: "2026-11-08T20:00:00Z", concluidoEm: "2026-11-08T20:30:00Z" }),
    ).toBe("Concluída em 08/11 17:30 (11.645 registros)");
  });
  it("começada depois da última conclusão está em andamento", () => {
    expect(
      rotuloFonte({ ...base, registros: 300, iniciadoEm: "2026-11-08T21:00:00Z", concluidoEm: "2026-11-08T20:30:00Z" }),
    ).toBe("Em andamento, 300 registros");
  });
  it("nunca rodou", () => {
    expect(rotuloFonte(undefined)).toBe("Ainda não sincronizado");
  });
  it("última rodada é a atualização mais recente", () => {
    expect(
      ultimaRodada([
        { ...base, iniciadoEm: null, concluidoEm: null, atualizadoEm: "2026-11-08T10:00:00Z" },
        { ...base, iniciadoEm: null, concluidoEm: null, atualizadoEm: "2026-11-08T22:15:00Z" },
      ]),
    ).toBe("08/11 19:15");
  });
});
