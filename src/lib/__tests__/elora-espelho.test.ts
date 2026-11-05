import { describe, expect, it } from "vitest";
import {
  chamarElora,
  duracaoSegundos,
  espera429,
  mapAtendimento,
  mapContato,
  decidirEspelho,
  mapMensagem,
  ORDEM_FONTES,
} from "../elora-espelho.server";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

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
  it("fonte \"antiga\" nunca usa o espelho, mesmo com carga completa", () => {
    const completos = [{ fonte: "contatos", concluido_em: "2026-11-01" }, { fonte: "atendimentos", concluido_em: "2026-11-01" }];
    expect(decidirEspelho("antiga", completos)).toBe(false);
    expect(decidirEspelho("automatica", completos)).toBe(true);
    expect(decidirEspelho("automatica", [completos[0]])).toBe(false);
    expect(decidirEspelho(undefined, completos)).toBe(true);
  });

  it("mensagem: colunas visíveis sem texto; bot = FROM_HUB sem userId", () => {
    const m = mapMensagem("c1", { id: "m1", sessionId: "s1", direction: "FROM_HUB", type: "TEXT", userId: null, timestamp: "2026-09-22T15:11:29Z", text: "oi" }, "s1");
    expect(m).toMatchObject({ sessao_id: "s1", direcao: "FROM_HUB", tipo: "TEXT", user_id_elora: null, eh_bot: true, enviada_em: "2026-09-22T15:11:29Z" });
    expect(Object.keys(m)).not.toContain("texto");
    expect(mapMensagem("c1", { id: "m2", direction: "FROM_HUB", userId: "u1" }, "s1").eh_bot).toBe(false);
    expect(mapMensagem("c1", { id: "m3", direction: "TO_HUB" }, "s1").eh_bot).toBeNull();
  });
  it("Sincronizar agora termina nas mensagens", () => {
    expect(ORDEM_FONTES).toEqual(["apoio", "contatos", "atendimentos", "mensagens"]);
  });
  it("nenhum código fora do espelho lê a tabela de mensagens (texto nunca sai do servidor)", () => {
    const raiz = join(__dirname, "..", "..");
    const achados: string[] = [];
    const andar = (d: string) => {
      for (const n of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, n.name);
        if (n.isDirectory()) { if (n.name !== "__tests__") andar(p); continue; }
        if (!/\.(ts|tsx)$/.test(n.name) || n.name === "elora-espelho.server.ts" || n.name === "types.ts") continue;
        if (readFileSync(p, "utf8").includes("elora_mensagens_espelho")) achados.push(p);
      }
    };
    andar(raiz);
    expect(achados).toEqual([]);
  });
});
