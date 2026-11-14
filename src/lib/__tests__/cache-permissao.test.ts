import { describe, expect, it } from "vitest";
import { aplicarPermissaoValores, cartaoSchema } from "@/lib/graficos";

const tabela = cartaoSchema.parse({
  id: "t", titulo: "Itens", tipo: "tabela_itens", fonte: "card",
  colunas: [{ fonte: "contato", campo: "nome" }, { fonte: "card", campo: "valor" }, { fonte: "card", campo: "campo.valor-consulta" }],
});
// resultado guardado no cache, calculado por quem vê valores
const guardado = {
  oculto: false,
  r: {
    colunasItens: [{ chave: "contato|nome", rotulo: "Nome" }, { chave: "card|valor", rotulo: "Valor do card" }, { chave: "card|campo.valor-consulta", rotulo: "Valor da consulta" }, { chave: "origem_calc", rotulo: "Origem" }],
    itens: [{ id: "1", valores: { "contato|nome": "Ana", "card|valor": "R$ 1.500,00", "card|campo.valor-consulta": "R$ 300,00", origem_calc: "ADS" }, brutos: { "contato|nome": "Ana", "card|valor": "1500", "card|campo.valor-consulta": "300" } }],
  },
};

describe("cache guarda o dado completo e a permissão de valores vem depois", () => {
  it("parceiro sem permissão não recebe nenhuma coluna nem valor de dinheiro, mesmo com cache de quem vê", () => {
    const x = aplicarPermissaoValores(tabela, guardado, true);
    expect(x.r.colunasItens.map((c: any) => c.chave)).toEqual(["contato|nome", "origem_calc"]);
    expect(JSON.stringify(x)).not.toContain("1500");
    expect(JSON.stringify(x)).not.toContain("R$");
  });
  it("cartão de dinheiro inteiro fica oculto para quem não vê valores", () => {
    const soma = cartaoSchema.parse({ id: "s", titulo: "Soma", tipo: "numero", fonte: "card", medida: "soma", campoMedida: { fonte: "card", campo: "valor" } });
    expect(aplicarPermissaoValores(soma, { oculto: false, r: { total: 504280 } }, true)).toEqual({ oculto: true, r: null });
  });
  it("quem vê valores recebe o resultado guardado sem mudança", () => {
    expect(aplicarPermissaoValores(tabela, guardado, false)).toBe(guardado);
  });
});
