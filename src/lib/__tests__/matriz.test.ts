import { describe, expect, it } from "vitest";
import { colunasMatriz, montarMatriz, opcoesDimensoes, somarPadraoPorDia, type ConfigMatriz } from "../matriz";
import { calcularIndicadoresCards, type Leitura, type PorDia } from "../indicadores-motor";
import { NAO_DEFINIDO, rotuloDimensao } from "../nao-definido";

const cfg = (p: Partial<ConfigMatriz>): ConfigMatriz => ({
  chave: "x",
  nome: "X",
  fonte: "cards",
  medida: "contagem",
  evento: { tipo: "virou_ganho" },
  condicoes: { op: "E", itens: [] },
  ordem: 100,
  tipo: "combinada",
  ativo: true,
  ...p,
});
const dias = ["2026-10-01", "2026-10-02"];

describe("princípio: dados incompletos", () => {
  it("valor ausente vira 'Não definido'", () => {
    expect(rotuloDimensao("")).toBe(NAO_DEFINIDO);
    expect(rotuloDimensao(null)).toBe(NAO_DEFINIDO);
    expect(rotuloDimensao("  ")).toBe(NAO_DEFINIDO);
    expect(rotuloDimensao("Canal A")).toBe("Canal A");
  });

  it("cliente sem mapa, cards e classificação mostra a Matriz com as 5 colunas padrão, sem erro", () => {
    const linhas = [{ dia: "2026-10-01", canal: "", atendente: "", equipe: "", novos_contatos: 3, novos_contatos_ads: 1, conversas_total_dia: 2, conversas_usuario: 1, conversas_bot: 1 }];
    const m = somarPadraoPorDia(linhas, {});
    const r = montarMatriz(colunasMatriz([]), dias, m, new Map());
    expect(r.colunas.map((c) => c.chave)).toEqual(["novos_contatos", "novos_contatos_ads", "conversas_total_dia", "conversas_usuario", "conversas_bot"]);
    expect(r.erros).toEqual([]);
    expect(r.total.novos_contatos.valor).toBe(3);
    expect(opcoesDimensoes(linhas)).toEqual({ canal: [NAO_DEFINIDO], atendente: [NAO_DEFINIDO], equipe: [NAO_DEFINIDO] });
  });

  it("filtro 'Não definido' pega as linhas sem equipe", () => {
    const base = { dia: "2026-10-01", canal: "C", atendente: "", novos_contatos: 0, novos_contatos_ads: 0, conversas_usuario: 0, conversas_bot: 0 };
    const linhas = [{ ...base, equipe: "", conversas_total_dia: 2 }, { ...base, equipe: "Atendimento", conversas_total_dia: 5 }];
    expect(somarPadraoPorDia(linhas, { equipe: NAO_DEFINIDO }).get("2026-10-01")!.conversas_total_dia.valor).toBe(2);
  });
});

describe("Matriz", () => {
  it("fórmula com coluna inexistente mostra erro de configuração, sem quebrar a Matriz", () => {
    const cols = colunasMatriz([cfg({ chave: "f", nome: "Taxa", tipo: "formula", formula: { op: "percentual", a: "Novos ADS", b: "Não existe" } })]);
    const r = montarMatriz(cols, dias, new Map(), new Map());
    expect(r.linhas[0].celulas.f.erro).toContain("não existe");
    expect(r.linhas[0].celulas.novos_contatos.valor).toBe(0);
    expect(r.erros).toHaveLength(1);
  });

  it("fórmula percentual entre colunas, também no total", () => {
    const m: PorDia = new Map([
      ["2026-10-01", { novos_contatos: { valor: 10, estimado: 0 }, novos_contatos_ads: { valor: 5, estimado: 0 } }],
      ["2026-10-02", { novos_contatos: { valor: 10, estimado: 0 }, novos_contatos_ads: { valor: 0, estimado: 0 } }],
    ]);
    const cols = colunasMatriz([cfg({ chave: "f", nome: "% ADS", tipo: "formula", formula: { op: "percentual", a: "Novos ADS", b: "Novos contatos" } })]);
    const r = montarMatriz(cols, dias, m, new Map());
    expect(r.linhas[0].celulas.f.valor).toBe(50);
    expect(r.total.f.valor).toBe(25);
  });

  it("dia estimado leva a marca, e o total que o soma também", () => {
    const m: PorDia = new Map([["2026-10-01", { x: { valor: 2, estimado: 2 } }], ["2026-10-02", { x: { valor: 1, estimado: 0 } }]]);
    const r = montarMatriz(colunasMatriz([cfg({})]), dias, m, new Map());
    expect(r.linhas[0].celulas.x.estimado).toBe(true);
    expect(r.linhas[1].celulas.x.estimado).toBe(false);
    expect(r.total.x).toEqual({ valor: 3, estimado: true });
  });

  it("coluna manual soma só os dias digitados; vazia fica sem valor", () => {
    const cols = colunasMatriz([cfg({ chave: "ss", nome: "Social Selling", tipo: "manual" })]);
    const r = montarMatriz(cols, dias, new Map(), new Map([["2026-10-01", { ss: 4 }]]));
    expect(r.linhas[0].celulas.ss.valor).toBe(4);
    expect(r.linhas[1].celulas.ss.valor).toBeNull();
    expect(r.total.ss.valor).toBe(4);
  });

  it("coluna padrão oculta e reordenada pela configuração do cliente", () => {
    const cols = colunasMatriz([{ ...cfg({ chave: "conversas_bot", nome: "Bot", tipo: "app", ativo: false, ordem: 0 }) }]);
    expect(cols[0].chave).toBe("conversas_bot");
    expect(montarMatriz(cols, dias, new Map(), new Map()).colunas.some((c) => c.chave === "conversas_bot")).toBe(false);
  });

  it("mesma regra com fontes diferentes (card x contato) dá resultados diferentes", () => {
    const l: Leitura = { card_id: "1", visto_em: "2026-10-01T15:00:00Z", estimado: false, etapa_id: null, etapa_titulo: null, status: "WON", criado_em: null, campos: { "card.campo.Data": "x" } };
    const regra = (fonte: "card" | "contato") => cfg({ condicoes: { op: "E", itens: [{ campo: { fonte, campo: "campo.Data" }, operador: "preenchido" }] } });
    expect(calcularIndicadoresCards([regra("card")], [l]).get("2026-10-01")?.x.valor).toBe(1);
    expect(calcularIndicadoresCards([regra("contato")], [l]).size).toBe(0);
  });
});
