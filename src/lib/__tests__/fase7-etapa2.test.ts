import { describe, expect, it } from "vitest";
import { agregarDoisValores, agregarMatrizUtm, aplicarAlternativa, cartaoSchema, cartaoTemDinheiro, itensTabela, origemCalculada, percentuaisFunil, tiposDisponiveis } from "../graficos";
import { montarCatalogo, type BaseCampos } from "../campos-elora";

const base: BaseCampos = {
  definicoes: [],
  contatos: [
    { id: "c1", nome: "Ana", origem: "WHATSAPP", utm_campaign: "camp-a", utm_source: "facebook", criado_em: "2026-10-01T12:00:00Z", utm: { content: "video-1" } },
    { id: "c2", nome: "Bia", origem: "WHATSAPP", criado_em: "2026-10-02T12:00:00Z" },
    { id: "c3", nome: "Caio", origem: "IMPORTED", criado_em: "2026-10-02T12:00:00Z" },
  ],
  atendimentos: [
    { id: "a1", contato_id: "c1", criado_em: "2026-10-01T13:00:00Z" },
    { id: "a2", contato_id: "c1", criado_em: "2026-10-03T13:00:00Z" },
    { id: "a3", contato_id: "c2", criado_em: "2026-10-03T13:00:00Z" },
    { id: "a4", contato_id: null, criado_em: "2026-10-03T13:00:00Z" },
  ],
  cards: [
    { id: "k1", contato_ids: ["c1"], valor: 1000, criado_em: "2026-10-01T12:00:00Z" },
    { id: "k2", contato_ids: ["c2"], valor: 500, criado_em: "2026-10-02T12:00:00Z" },
  ],
};
const p = { de: "2026-10-01", ate: "2026-10-05" };
const cfg = (x: any) => cartaoSchema.parse({ id: "x", titulo: "T", fonte: "contato", ...x });

describe("Fase 7 · Etapa 2 · novos tipos de bloco", () => {
  it("Dois valores: soma do campo e quantidade", () => {
    const r = agregarDoisValores(base, cfg({ tipo: "dois_valores", fonte: "card", campoMedida: { fonte: "card", campo: "valor" } }), p);
    expect(r.total).toBe(1500);
    expect(r.qtd).toBe(2);
  });
  it("Dois valores com campo de valor é dinheiro (some para parceiro sem permissão)", () => {
    expect(cartaoTemDinheiro(cfg({ tipo: "dois_valores", fonte: "card", campoMedida: { fonte: "card", campo: "valor" } }))).toBe(true);
  });
  it("Matriz por UTM soma o mesmo total das novas conversas do período e tira importados dos novos contatos", () => {
    const r = agregarMatrizUtm(base, cfg({ tipo: "matriz_utm", agrupar: [{ fonte: "utm", campo: "campaign" }] }), p);
    const soma = r.categorias.reduce((a, c) => a + c.valores["Novas conversas"], 0);
    expect(soma).toBe(4);
    expect(r.total).toBe(4);
    expect(r.categorias.reduce((a, c) => a + c.valores["Novos contatos"], 0)).toBe(2);
  });
  it("Matriz por UTM: só patrocinados conta apenas contatos com campanha", () => {
    const r = agregarMatrizUtm(base, cfg({ tipo: "matriz_utm", soPatrocinados: true }), p);
    expect(r.total).toBe(2);
  });
  it("Origem calculada segue a regra de ADS do motor (campanha = patrocinado)", () => {
    expect(origemCalculada(base.contatos[0])).toBe("Patrocinado");
    expect(origemCalculada(base.contatos[1])).toBe("Orgânico");
    expect(origemCalculada(base.contatos[2])).toBe("Outro");
  });
  it("Tabela de itens tira colunas de dinheiro para quem não vê valores", () => {
    const c = cfg({ tipo: "tabela_itens", fonte: "card", colunas: [{ fonte: "card", campo: "valor" }, { fonte: "contato", campo: "nome" }] });
    expect(itensTabela(base, c, p, [], false).colunasItens?.map((x) => x.chave)).toContain("card|valor");
    const sem = itensTabela(base, c, p, [], true);
    expect(sem.colunasItens?.map((x) => x.chave)).not.toContain("card|valor");
    expect(sem.itens?.[0].valores.origem_calc).toBe("Patrocinado");
  });
  it("Alternar medida não altera o bloco salvo", () => {
    const c = cfg({ tipo: "barras_empilhadas", medidasAlternaveis: [{ rotulo: "Conversas", fonte: "atendimento", medida: "contagem" }] });
    const alt = aplicarAlternativa(c, 0);
    expect(alt.fonte).toBe("atendimento");
    expect(c.fonte).toBe("contato");
  });
  it("Funil etapas = conversão sobre a faixa anterior; ranking = % do total", () => {
    expect(percentuaisFunil([{ total: 100 }, { total: 40 }, { total: 10 }], "etapas")).toEqual([null, 40, 25]);
    expect(percentuaisFunil([{ total: 50 }, { total: 50 }], "ranking")).toEqual([50, 50]);
  });
  it("Todas as UTMs do Elora entram no catálogo; tipo sem dado não aparece", () => {
    const cat = montarCatalogo(base);
    expect(cat.find((g) => g.fonte === "utm")?.campos.map((c) => c.campo)).toContain("content");
    const vazio = montarCatalogo({ definicoes: [], contatos: [], atendimentos: [], cards: [] });
    const t = tiposDisponiveis(vazio, { dimensao: null, medida: "contagem" });
    expect(t).not.toContain("matriz_utm");
    expect(t).not.toContain("dois_valores");
    expect(t).not.toContain("tabela_itens");
  });
});

describe("Fase 7 · Etapa 3", () => {
  it("Matriz por UTM com a regra da Matriz: conversa sem contato vai para Não definido e a soma fecha", () => {
    const conv = [{ sessao: "a1", dia: "2026-10-01" }, { sessao: "a1", dia: "2026-10-02" }, { sessao: "a3", dia: "2026-10-03" }, { sessao: "a4", dia: "2026-10-03" }, { sessao: "zz", dia: "2026-10-03" }];
    const r = agregarMatrizUtm(base, cartaoSchema.parse({ id: "m", titulo: "M", tipo: "matriz_utm", fonte: "utm" }), p, [], conv);
    expect(r.total).toBe(4);
    expect(r.categorias.find((c) => c.rotulo === "Não definido")?.valores["Novas conversas"]).toBe(2);
    const so = agregarMatrizUtm(base, cartaoSchema.parse({ id: "m", titulo: "M", tipo: "matriz_utm", fonte: "utm", soPatrocinados: true }), p, [], conv);
    expect(so.total).toBe(2);
  });
  it("Dois valores por indicador: quantidade = cards contados, valor = soma desses cards", async () => {
    const { doisValoresDeCards } = await import("../graficos");
    const r = doisValoresDeCards(base, cartaoSchema.parse({ id: "d", titulo: "D", tipo: "dois_valores", fonte: "card", campoMedida: { fonte: "card", campo: "valor" } }), [{ card_id: "k1", estimado: true }], null);
    expect(r.qtd).toBe(1);
    expect(r.total).toBe(1000);
    expect(r.qtdEstimados).toBe(1);
  });
});
