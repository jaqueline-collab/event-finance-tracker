import { describe, expect, it } from "vitest";
import { cartaoSchema } from "@/lib/graficos";
import { cartaoComDadosPessoais, cartaoPedido, cartoesDoLink, CSP_INCORPORADO, hashToken, novoToken, tokenValido } from "@/lib/incorporar";

const c = (x: Record<string, unknown>) => cartaoSchema.parse({ id: "a", titulo: "Bloco", tipo: "barras", fonte: "atendimento", ...x });

describe("painel incorporado", () => {
  it("sem liberação, esconde tabela de itens, calendário e agrupado por nome do contato", () => {
    const lista = [
      c({ id: "num", tipo: "numero" }),
      c({ id: "itens", tipo: "tabela_itens", fonte: "contato" }),
      c({ id: "cal", tipo: "calendario", fonte: "card" }),
      c({ id: "nome", fonte: "contato", dimensao: { fonte: "contato", campo: "nome" } }),
      c({ id: "canal", dimensao: { fonte: "atendimento", campo: "canal" } }),
    ];
    expect(cartoesDoLink(lista, [], false).map((x) => x.id)).toEqual(["num", "canal"]);
    expect(cartoesDoLink(lista, [], true).map((x) => x.id)).toEqual(["num", "itens", "cal", "nome", "canal"]);
  });

  it("blocos ocultos da visão nunca aparecem no link", () => {
    expect(cartoesDoLink([c({ id: "x", tipo: "numero" })], ["x"], true)).toEqual([]);
  });

  it("telefone também é dado pessoal", () => {
    expect(cartaoComDadosPessoais(c({ dimensao: { fonte: "contato", campo: "telefone" } }))).toBe(true);
  });

  it("quem vê não troca tipo, filtros nem medida fora das alternativas do bloco", () => {
    const gravado = c({ id: "g", tipo: "numero", filtros: [{ fonte: "atendimento", campo: "canal", op: "em", valores: ["A"] }] });
    const pedido = { ...gravado, tipo: "tabela_itens" as const, filtros: [], medida: "soma" as const };
    const r = cartaoPedido(gravado, pedido);
    expect(r.tipo).toBe("numero");
    expect(r.filtros).toEqual(gravado.filtros);
    expect(r.medida).toBe("contagem");
  });

  it("aceita a medida alternativa oferecida pelo bloco", () => {
    const gravado = c({ medidasAlternaveis: [{ rotulo: "Cards", fonte: "card", medida: "contagem" }] });
    expect(cartaoPedido(gravado, { ...gravado, fonte: "card" }).fonte).toBe("card");
  });

  it("token é longo e aleatório; só o hash SHA-256 é guardado", async () => {
    const a = novoToken(), b = novoToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(43);
    expect(tokenValido(a)).toBe(true);
    expect(await hashToken(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashToken(a)).not.toContain(a);
  });

  it("só o Elora App pode emoldurar o link", () => {
    expect(CSP_INCORPORADO).toBe("frame-ancestors https://app.eloracrm.com.br");
  });
});
