import { describe, expect, it } from "vitest";
import { resolverStatusLead, ordenarPor, corEtiqueta, colunaStatusValida } from "../status-lead";
import { colunasVisiveis, compararGrupo, estadoInicial, moverColuna } from "../colunas-tabela";
import { montarCatalogo, type BaseCampos } from "../campos-elora";
import { cartaoSchema, itensTabela, agregarCartao } from "../graficos";

const F = "funil-a";
const contatos = () => [{ id: "c1" }, { id: "c2" }, { id: "c3" }] as any[];
const cards = () => [
  { id: "k1", contato_ids: ["c1"], painel_id: F, etapa: "Consulta", atualizado_em: "2026-11-01T10:00:00Z", status: "OPEN" },
  { id: "k2", contato_ids: ["c1"], painel_id: F, etapa: "Agendados", atualizado_em: "2026-11-05T10:00:00Z", status: "WON" },
  { id: "k3", contato_ids: ["c2"], painel_id: "outro", etapa: "Pendente", atualizado_em: "2026-11-06T10:00:00Z", status: "OPEN" },
] as any[];

describe("Status do lead", () => {
  it("contato usa o card mais recente do funil; sem card no funil fica em branco", () => {
    const c = contatos(), k = cards();
    resolverStatusLead(c, k, { fonte: "card", funilId: F, campo: "etapa" });
    expect(c.map((x) => x.status_lead)).toEqual(["Agendados", null, null]);
  });
  it("card do funil usa o próprio card; card de outro funil usa o do contato", () => {
    const c = contatos(), k = cards();
    resolverStatusLead(c, k, { fonte: "card", funilId: F, campo: "etapa" });
    expect(k.map((x) => x.status_lead)).toEqual(["Consulta", "Agendados", null]);
  });
  it("Situação do card vem do campo status", () => {
    const c = contatos(), k = cards();
    resolverStatusLead(c, k, { fonte: "card", funilId: F, campo: "status" });
    expect(c[0].status_lead).toBe("WON");
  });
  it("origem no contato vale também para os cards dele", () => {
    const c = [{ id: "c1", origem: "Instagram" }] as any[], k = [{ id: "k", contato_ids: ["c1"] }] as any[];
    resolverStatusLead(c, k, { fonte: "contato", campo: "origem" });
    expect(k[0].status_lead).toBe("Instagram");
  });
  it("card sem funil escolhido é recusado", () => {
    expect(colunaStatusValida({ fonte: "card", campo: "etapa" })).toBeNull();
  });
  it("sem origem a coluna não existe no catálogo nem na tabela", () => {
    const base: BaseCampos = { definicoes: [], contatos: [{ id: "c1", nome: "A", criado_em: "2026-11-01T12:00:00Z" }], atendimentos: [], cards: [] };
    const cat = montarCatalogo(base);
    expect(cat.flatMap((g) => g.campos).some((x) => x.campo === "status_lead")).toBe(false);
    const r = itensTabela(base, cartaoSchema.parse({ id: "t", titulo: "T", tipo: "tabela_itens", fonte: "contato" }), { de: "2026-11-01", ate: "2026-11-02" }, [], false);
    expect(r.colunasItens!.some((x) => x.chave.endsWith("status_lead"))).toBe(false);
  });
  it("com origem: etiqueta na tabela, célula vazia em branco, opções na ordem do funil", () => {
    const base: BaseCampos = {
      definicoes: [], atendimentos: [], cards: [],
      contatos: [{ id: "c1", criado_em: "2026-11-01T12:00:00Z", status_lead: "Pendente" }, { id: "c2", criado_em: "2026-11-01T12:00:00Z", status_lead: null }, { id: "c3", criado_em: "2026-11-01T12:00:00Z", status_lead: "Agendados" }],
      ordens: { "contato|status_lead": ["Saudação", "Pendente", "Agendados"] }, rotuloStatus: "Etapa do lead",
    };
    const campo = montarCatalogo(base).flatMap((g) => g.campos).find((x) => x.campo === "status_lead")!;
    expect(campo.rotulo).toBe("Etapa do lead");
    expect(campo.opcoes!.slice(0, 2)).toEqual(["Pendente", "Agendados"]);
    const r = itensTabela(base, cartaoSchema.parse({ id: "t", titulo: "T", tipo: "tabela_itens", fonte: "contato" }), { de: "2026-11-01", ate: "2026-11-02" }, [], false);
    expect(r.etiquetas).toEqual(["contato|status_lead"]);
    expect(r.itens!.map((i) => i.valores["contato|status_lead"])).toEqual(["Pendente", "", "Agendados"]);
    const g = agregarCartao(base, cartaoSchema.parse({ id: "b", titulo: "B", tipo: "barras", fonte: "contato", dimensao: { fonte: "contato", campo: "status_lead" } }), { de: "2026-11-01", ate: "2026-11-02" });
    expect(g.categorias.map((x) => x.rotulo)).toEqual(["Pendente", "Agendados", "Sem informação"]);
  });
  it("filtro pelo status conta os mesmos contatos que a célula mostra", () => {
    const base: BaseCampos = { definicoes: [], atendimentos: [], cards: [], rotuloStatus: "S",
      contatos: [{ id: "c1", criado_em: "2026-11-01T12:00:00Z", status_lead: "Pendente" }, { id: "c2", criado_em: "2026-11-01T12:00:00Z", status_lead: "Agendados" }] };
    const r = itensTabela(base, cartaoSchema.parse({ id: "t", titulo: "T", tipo: "tabela_itens", fonte: "contato" }), { de: "2026-11-01", ate: "2026-11-02" }, [{ fonte: "contato", campo: "status_lead", op: "em", valores: ["Pendente"] }], false);
    expect(r.itens!.map((i) => i.id)).toEqual(["c1"]);
  });
  it("ordem do funil e cor estável", () => {
    expect(ordenarPor(["B", "Z", "A"], ["A", "B"], (x) => x)).toEqual(["A", "B", "Z"]);
    expect(corEtiqueta("X")).toBe(corEtiqueta("X"));
  });
});

describe("Lista Colunas", () => {
  const cols = [{ chave: "a", rotulo: "A" }, { chave: "b", rotulo: "B", fixa: true }, { chave: "c", rotulo: "C", oculta: true }];
  it("fixadas vêm primeiro e ocultas saem", () => {
    expect(colunasVisiveis(cols, estadoInicial(cols)).map((c) => c.chave)).toEqual(["b", "a"]);
  });
  it("reordenar troca vizinhos", () => {
    expect(moverColuna(["a", "b", "c"], 0, 1)).toEqual(["b", "a", "c"]);
  });
  it("agrupar segue o funil e vazio vai por último", () => {
    expect(["", "Z", "B", "A"].sort((x, y) => compararGrupo(x, y, ["B", "A"]))).toEqual(["B", "A", "Z", ""]);
  });
});

describe("Status do lead como coluna normal", () => {
  it("fica na posição escolhida (tabela e exportar usam a mesma ordem)", () => {
    const base: BaseCampos = { definicoes: [], atendimentos: [], cards: [], rotuloStatus: "Etapa",
      contatos: [{ id: "c1", nome: "A", telefone: "1", criado_em: "2026-11-01T12:00:00Z", status_lead: "Pendente" }] };
    const cfg = cartaoSchema.parse({ id: "t", titulo: "T", tipo: "tabela_itens", fonte: "contato",
      colunas: [{ fonte: "contato", campo: "nome" }, { fonte: "contato", campo: "status_lead" }, { fonte: "contato", campo: "telefone" }] });
    const r = itensTabela(base, cfg, { de: "2026-11-01", ate: "2026-11-02" }, [], false);
    expect(r.colunasItens!.map((c) => c.chave).slice(0, 3)).toEqual(["contato|nome", "contato|status_lead", "contato|telefone"]);
    expect(r.colunasItens![1].rotulo).toBe("Etapa");
  });
});
