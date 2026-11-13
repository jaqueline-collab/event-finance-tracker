import { describe, expect, it } from "vitest";
import { ehUrl, formatarCelula, formatarDataHora, formatarMoeda, formatarTelefone, rotuloCorrido, textoLink } from "../formatos";
import { CANAL_SEM_NOME, exibirCanal, montarMapaCanais } from "../nome-canal";
import { filtrarPorTipo, rotuloTipoData } from "../graficos";
import { COR_TIPO_CALENDARIO } from "@/components/cartoes-graficos";
import { limiteDe } from "../layout-blocos";

describe("formatos brasileiros", () => {
  it("data com hora em Brasília", () => {
    expect(formatarDataHora("2026-11-06T14:30:00Z")).toBe("06/11/2026 11:30");
    expect(formatarDataHora("2026-11-06")).toBe("06/11/2026");
  });
  it("valor em reais com centavos", () => {
    expect(formatarMoeda(10990)).toBe("R$ 10.990,00");
    expect(formatarCelula("valor-da-consulta", "150")).toBe("R$ 150,00");
  });
  it("telefone (DDI) DDD 00000-0000, sem inventar dígito", () => {
    expect(formatarTelefone("5541999990000")).toBe("(55) 41 99999-0000");
    expect(formatarTelefone("554199990000")).toBe("(55) 41 9999-0000");
    expect(formatarTelefone("12345")).toBe("12345");
  });
  it("link clicável com texto curto", () => {
    expect(ehUrl("https://exemplo.com/a?utm=1")).toBe(true);
    expect(ehUrl("exemplo")).toBe(false);
    expect(textoLink("https://www.exemplo.com/" + "x".repeat(80)).length).toBe(40);
  });
  it("cabeçalho em português corrido", () => {
    expect(rotuloCorrido("Data Da Consulta")).toBe("Data da consulta");
    expect(rotuloCorrido("utm-origem")).toBe("UTM origem");
  });
});

describe("nome do canal", () => {
  const m = montarMapaCanais([{ id: "c1", nomes: ["inst-8x9"] }, { id: "c2", nomes: ["inst-zz"] }], { c1: "Clínica Centro", c2: null });
  it("usa o apelido da super admin", () => expect(exibirCanal(m, "c1")).toBe("Clínica Centro"));
  it("sem apelido mostra Canal sem nome, nunca o código", () => {
    expect(exibirCanal(m, "c2")).toBe(CANAL_SEM_NOME);
    expect(exibirCanal(m, null, "inst-zz")).toBe(CANAL_SEM_NOME);
    expect(exibirCanal(m, null, "codigo-desconhecido")).toBe(CANAL_SEM_NOME);
  });
});

describe("calendário", () => {
  it("consulta amarela com texto marinho, procedimento verde", () => {
    expect(COR_TIPO_CALENDARIO[0]).toBe("bg-brand text-brand-foreground");
    expect(COR_TIPO_CALENDARIO[1]).toBe("bg-success text-success-foreground");
  });
  it("filtro Todos mostra os dois tipos; Consultas só o primeiro", () => {
    const xs = [{ tipo: 0 }, { tipo: 1 }, { tipo: 1 }];
    expect(filtrarPorTipo(xs, "todos")).toHaveLength(3);
    expect(filtrarPorTipo(xs, 0)).toHaveLength(1);
  });
  it("rótulos Consultas e Procedimentos vêm do nome do campo", () => {
    expect(rotuloTipoData({ fonte: "card", campo: "campo.data-da-consulta" })).toBe("Consultas");
    expect(rotuloTipoData({ fonte: "card", campo: "campo.data-do-procedimento" })).toBe("Procedimentos");
  });
  it("pode crescer em largura e altura", () => {
    expect(limiteDe("calendario").minL).toBeLessThanOrEqual(4);
    expect(limiteDe("calendario").maxA).toBe(12);
  });
});
