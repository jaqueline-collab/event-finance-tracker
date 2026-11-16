import { describe, expect, it } from "vitest";
import { rotuloCampanha, textoBloco, textoColuna } from "../textos-info";

describe("textos do i", () => {
  it("os três que aguardam decisão ficam sem texto", () => {
    expect(textoColuna("Usuário do sistema")).toBeNull();
    expect(textoColuna("Bot")).toBeNull();
    expect(textoBloco("Conversas por atendente")).toBeNull();
  });
  it("colunas e blocos aprovados têm texto", () => {
    expect(textoColuna("Consulta Agendada")?.fonte).toContain("Não é o dia da consulta");
    expect(textoBloco("Atendimentos por canal")?.oque).toBe("Atendimentos por canal de entrada.");
    expect(textoBloco("Leads por Origem")?.oque).toBe("Novos leads repartidos pelo item escolhido.");
  });
  it("UTM vira Campanha de anúncio nos títulos", () => {
    expect(rotuloCampanha("UTM origem")).toBe("Campanha de anúncio (origem)");
    expect(rotuloCampanha("UTM campanha")).toBe("Campanha de anúncio (nome)");
    expect(rotuloCampanha("UTM URL de referência")).toBe("Campanha de anúncio (página de entrada)");
    expect(rotuloCampanha("Telefone")).toBe("Telefone");
  });
});

import { textoBlocoOuAuto, textoColunaOuAuto } from "@/lib/textos-info";
describe("reserva automática do i", () => {
  it("bloco com texto usa o dicionário", () => { expect(textoBlocoOuAuto({ titulo: "TMR" }).oque).toBe("Tempo médio até a primeira resposta."); });
  it("bloco sem texto usa o automático", () => { expect(textoBlocoOuAuto({ titulo: "Bloco novo xyz", medida: "contagem", fonte: "card" }).oque).toContain("Quantidade de cards"); });
  it("coluna sem texto nunca fica vazia", () => { expect(textoColunaOuAuto("Coluna inventada").oque.length).toBeGreaterThan(0); });
});
