import { describe, expect, it } from "vitest";
import { corParaHex, textoSobre } from "../cores-status";
import { atualizadoAte, fontesParadas } from "../sync-orquestrador.server";
describe("cores do Elora App", () => {
  it("SKY_400 vira o tom exato", () => expect(corParaHex("SKY_400")).toBe("#38bdf8"));
  it("hex escolhido é mantido", () => expect(corParaHex("#AABBCC")).toBe("#aabbcc"));
  it("cor desconhecida fica com a padrão", () => expect(corParaHex("XYZ_1")).toBeNull());
  it("texto escuro sobre fundo claro", () => expect(textoSobre("#bbf7d0")).toBe("#000000"));
});
describe("sincronização", () => {
  const agora = Date.parse("2026-11-15T20:00:00Z");
  it("fonte sem atualizar há mais de 6 h gera alerta", () => {
    const e = ["apoio", "contatos", "atendimentos", "mensagens", "cards"].map((fonte) => ({ fonte, atualizado_em: "2026-11-15T19:00:00Z" }));
    e[3].atualizado_em = "2026-11-15T13:59:00Z";
    expect(fontesParadas(e, agora)).toEqual(["mensagens"]);
  });
  it("atualizado até = conclusão mais antiga", () => {
    expect(atualizadoAte([{ fonte: "contatos", concluido_em: "2026-11-15T19:00:00Z" }, { fonte: "atendimentos", concluido_em: "2026-11-15T18:00:00Z" }, { fonte: "mensagens", concluido_em: "2026-11-15T17:00:00Z" }, { fonte: "cards", concluido_em: "2026-11-15T19:30:00Z" }])).toBe("2026-11-15T17:00:00Z");
  });
});
