import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { montarCatalogo, type BaseCampos } from "@/lib/campos-elora";
import { agregarCartao, cartaoDeIndicador, cartaoSchema, fontesDisponiveis, tiposDisponiveis } from "@/lib/graficos";
import { NAO_DEFINIDO } from "@/lib/nao-definido";

const p = { de: "2026-10-01", ate: "2026-10-02" };
const semCards: BaseCampos = {
  definicoes: [],
  contatos: [
    { id: "a", origem: "CREATED_FROM_HUB", utm_campaign: "X", criado_em: "2026-10-01T15:00:00Z" },
    { id: "b", origem: null, criado_em: "2026-10-01T16:00:00Z" },
    { id: "c", origem: "IMPORTED", criado_em: "2026-10-02T15:00:00Z" },
  ],
  atendimentos: [
    { id: "s1", contato_id: "a", canal: "Canal 1", criado_em: "2026-10-01T15:00:00Z", tempo_espera: 60 },
    { id: "s2", contato_id: "b", canal: null, criado_em: "2026-10-01T17:00:00Z", tempo_espera: 120 },
  ],
  cards: [],
};
const comCards: BaseCampos = {
  ...semCards,
  cards: [
    { id: "k1", contato_ids: ["a"], etapa: "Agendados", criado_em: "2026-10-01T15:00:00Z", cf: { cidade: ["BH"] } },
    { id: "k2", contato_ids: ["a"], etapa: "Agendados", criado_em: "2026-10-01T16:00:00Z", cf: { cidade: ["BH"] } },
  ],
};
const cartao = (o: Record<string, unknown>) => cartaoSchema.parse({ id: "t", titulo: "T", tipo: "barras", fonte: "contato", ...o });

describe("Construtor de gráficos", () => {
  it("cliente sem cards nem classificação: só fontes e tipos que existem, sem erro", () => {
    const cat = montarCatalogo(semCards);
    expect(fontesDisponiveis(cat)).not.toContain("card");
    expect(tiposDisponiveis(cat, { dimensao: { fonte: "contato", campo: "origem" }, medida: "contagem" })).not.toContain("mapa");
    const r = agregarCartao(semCards, cartao({ dimensao: { fonte: "contato", campo: "origem" } }), p);
    expect(r.categorias.find((c) => c.rotulo === NAO_DEFINIDO)?.total).toBe(1);
    expect(r.total).toBe(3);
  });
  it("dois clientes com campos diferentes têm opções diferentes", () => {
    const a = montarCatalogo(semCards), b = montarCatalogo(comCards);
    expect(fontesDisponiveis(b)).toContain("card");
    expect(JSON.stringify(a.map((g) => g.campos.map((c) => c.campo)))).not.toBe(JSON.stringify(b.map((g) => g.campos.map((c) => c.campo))));
    expect(tiposDisponiveis(b, { dimensao: { fonte: "card", campo: "campo.cidade" }, medida: "contagem" })).toContain("mapa");
  });
  it("filtro de outra fonte (card) não duplica atendimentos de um contato com 2 cards", () => {
    const r = agregarCartao(comCards, cartao({ fonte: "atendimento", dimensao: null, filtros: [{ fonte: "card", campo: "etapa", op: "em", valores: ["Agendados"] }] }), p);
    expect(r.total).toBe(1);
  });
  it("Top N agrupa o resto em Outros; tempo médio é média simples", () => {
    const r = agregarCartao(semCards, cartao({ dimensao: { fonte: "contato", campo: "origem" }, topN: 1 }), p);
    expect(r.categorias.map((c) => c.rotulo)).toContain("Outros");
    expect(r.categorias.reduce((a, c) => a + c.total, 0)).toBe(3);
    const t = agregarCartao(semCards, cartao({ fonte: "atendimento", medida: "tempo_medio", dimensao: null, campoMedida: { fonte: "atendimento", campo: "tempo_espera" } }), p);
    expect(t.total).toBe(90);
  });
  it("indicador da Matriz: mesmo número da Matriz, dias estimados marcados e fora do total", () => {
    const linhas = [
      { dia: "2026-10-01", celulas: { x: { valor: 5 } } },
      { dia: "2026-10-02", celulas: { x: { valor: 3, estimado: true } } },
      { dia: "2026-10-03", celulas: { x: { valor: 2 } } },
    ];
    const r = cartaoDeIndicador(linhas, "x", cartao({ medida: "indicador", indicador: "x" }), null);
    expect(r.total).toBe(7);
    expect(r.estimados).toEqual(["2026-10-02"]);
  });
  it("só super admin cria/edita/move cartão (o servidor confere antes de gravar)", () => {
    const src = readFileSync("src/lib/graficos.functions.ts", "utf8");
    for (const nome of ["salvarCartoesVisao", "moverCartaoVisao"]) {
      const b = src.slice(src.indexOf(`export const ${nome}`));
      expect(b.indexOf("if (!a.superAdmin) throw")).toBeGreaterThan(-1);
      expect(b.indexOf("if (!a.superAdmin) throw")).toBeLessThan(b.indexOf("await gravar("));
    }
    expect(src).toContain('if (data.previa && !a.superAdmin) throw');
    expect(src).toContain("cartaoTemDinheiro(c)) return { oculto: true");
  });
});
