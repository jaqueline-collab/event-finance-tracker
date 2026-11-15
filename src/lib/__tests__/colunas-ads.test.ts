import { describe, expect, it } from "vitest";
import { alternarColunasAds, colunasVisiveis, estadoInicial } from "../colunas-tabela";

describe("ADS disponível ao leitor sem alterar números", () => {
  const cols = [{ chave: "novos_contatos", rotulo: "Novos contatos" }, { chave: "novos_contatos_ads", rotulo: "Novos ADS" }, { chave: "manual", rotulo: "Manual", oculta: true }];
  it("oculta e restaura ADS apenas na sessão, preservando as demais colunas", () => {
    const antes = estadoInicial(cols);
    const oculto = alternarColunasAds(antes, cols.map((c) => c.chave), false);
    expect(colunasVisiveis(cols, oculto).map((c) => c.chave)).toEqual(["novos_contatos"]);
    expect(alternarColunasAds(oculto, cols.map((c) => c.chave), true)).toEqual(antes);
    expect(antes.ocultas).toEqual(["manual"]);
  });
  it("os números de ADS são os mesmos ao voltar a mostrar e exportar", () => {
    const linha = { novos_contatos: 639, novos_contatos_ads: 518 };
    const antes = estadoInicial(cols);
    const depois = alternarColunasAds(alternarColunasAds(antes, cols.map((c) => c.chave), false), cols.map((c) => c.chave), true);
    const exportar = (e: typeof antes) => colunasVisiveis(cols, e).map((c) => linha[c.chave as keyof typeof linha]);
    expect(exportar(depois)).toEqual([639, 518]);
    expect(exportar(depois)).toEqual(exportar(antes));
  });
});