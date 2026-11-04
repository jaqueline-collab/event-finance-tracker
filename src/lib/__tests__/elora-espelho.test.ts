import { describe, expect, it } from "vitest";
import {
  chamarElora,
  duracaoSegundos,
  espera429,
  mapAtendimento,
  mapContato,
  LEITURA_ANTIGA,
} from "../elora-espelho.server";

const ctx = (respostas: number[]) => {
  const esperas: number[] = [];
  let i = 0;
  return {
    esperas,
    c: {
      base: "https://x",
      chave: "k",
      chamadas: 0,
      retentativas: 0,
      erros: [] as string[],
      dormir: async (ms: number) => void esperas.push(ms),
      fetcher: (async () => {
        const st = respostas[Math.min(i++, respostas.length - 1)];
        return new Response(JSON.stringify({ items: [] }), { status: st });
      }) as unknown as typeof fetch,
    },
  };
};

describe("limite da API", () => {
  it("espera 15 s, 30 s, 45 s em 429 e pausa 250 ms entre chamadas", async () => {
    const { c, esperas } = ctx([429, 429, 429, 200]);
    await chamarElora(c, "/a");
    expect(esperas.filter((m) => m !== 250)).toEqual([15_000, 30_000, 45_000]);
    expect(esperas.filter((m) => m === 250).length).toBe(4);
    expect(c.retentativas).toBe(3);
    expect(c.chamadas).toBe(4);
  });
  it("desiste depois de 5 tentativas e registra o erro", async () => {
    const { c } = ctx([429]);
    await expect(chamarElora(c, "/a")).rejects.toThrow();
    expect(c.chamadas).toBe(5);
    expect(c.erros.length).toBe(1);
  });
  it("espera429 cresce de 15 em 15 s", () => {
    expect([0, 1, 2, 3].map(espera429)).toEqual([15_000, 30_000, 45_000, 60_000]);
  });
});

describe("mapeamento", () => {
  it("atendimento de qualquer canal guarda canal e classificação por categoryDescription", () => {
    const r = mapAtendimento("c1", {
      id: "s1",
      channelId: "ch9",
      channelType: "INSTAGRAM",
      channelDetails: { displayName: "@loja" },
      classification: { categoryDescription: "Venda", amount: "150.5" },
      timeService: "168:14:54",
    });
    expect(r.canal_id).toBe("ch9");
    expect(r.canal_nome).toBe("@loja");
    expect(r.classificacao).toBe("Venda");
    expect(r.valor).toBe(150.5);
    expect(r.time_service_segundos).toBe(168 * 3600 + 14 * 60 + 54);
    expect(r.cliente_id).toBe("c1");
  });
  it("contato lê etiquetas de tagNames", () => {
    expect(mapContato("c1", { id: "1", tagNames: ["A", "B"] }).etiquetas).toEqual(["A", "B"]);
  });
  it("duração com dias", () => {
    expect(duracaoSegundos("1.02:00:00")).toBe(86400 + 7200);
  });
  it("Dr. Gean continua na leitura antiga", () => {
    expect(LEITURA_ANTIGA.has("jvu3dzqk")).toBe(true);
  });
});
