import { describe, expect, it } from "vitest";
import { aplicarFixosGravados, filtrosFixosValidos, textoSelo } from "../filtros-fixos";
import { cartaoSchema, itensTabela, agregarCartao } from "../graficos";
import type { BaseCampos, FiltroCampo } from "../campos-elora";

const vinicius: FiltroCampo = { fonte: "atendimento", campo: "atendente", op: "em", valores: ["Vinicius"] };
const canalX: FiltroCampo = { fonte: "atendimento", campo: "canal", op: "em", valores: ["X"] };
const base: BaseCampos = {
  definicoes: [],
  contatos: [{ id: "c1", nome: "Ana" }, { id: "c2", nome: "Bia" }, { id: "c3", nome: "Caio" }] as any,
  atendimentos: [
    { id: "a1", contato_id: "c1", atendente: "Vinicius", canal: "X", criado_em: "2026-11-02T13:00:00Z" },
    { id: "a2", contato_id: "c1", atendente: "Maria", canal: "X", criado_em: "2026-11-03T13:00:00Z" },
    { id: "a3", contato_id: "c2", atendente: "Vinicius", canal: "Y", criado_em: "2026-11-03T14:00:00Z" },
    { id: "a4", contato_id: "c3", atendente: null, canal: "X", criado_em: "2026-11-04T14:00:00Z" },
  ] as any,
  cards: [],
};
const P = { de: "2026-11-01", ate: "2026-11-30" };
const tabela = (filtros: FiltroCampo[] = []) => cartaoSchema.parse({ id: "t1", titulo: "Atendimentos", tipo: "tabela_itens", fonte: "atendimento", filtros, colunas: [{ fonte: "atendimento", campo: "atendente" }, { fonte: "atendimento", campo: "canal" }] });

describe("Filtros fixos", () => {
  it("o servidor usa o filtro gravado: quem vê não remove mandando o bloco sem filtro", () => {
    const gravado = tabela([vinicius]);
    const r = aplicarFixosGravados([tabela([])], [{ id: "v", cartoes: [gravado], filtrosFixos: [] }], []);
    expect(r.cartoes[0].filtros).toEqual([vinicius]);
  });
  it("filtro fixo da visão vem antes e os de quem vê entram por cima", () => {
    const r = aplicarFixosGravados([tabela()], [{ id: "v", cartoes: [tabela()], filtrosFixos: [vinicius] }], [canalX]);
    expect(r.filtrosVisao).toEqual([vinicius, canalX]);
  });
  it("bloco que não está gravado (prévia) segue como veio", () => {
    const r = aplicarFixosGravados([tabela([canalX])], [], []);
    expect(r.cartoes[0].filtros).toEqual([canalX]);
  });
  it("tabela de Atendimentos com 'Atendente: Vinicius' lista só os atendimentos dele", () => {
    const r = itensTabela(base, tabela([vinicius]), P, [], false);
    expect(r.itens!.map((i) => i.id).sort()).toEqual(["a1", "a3"]);
  });
  it("exportar sai só com as linhas do filtro", () => {
    const r = itensTabela(base, tabela([vinicius]), P, [], false);
    const vis = r.colunasItens!.filter((c) => !c.oculta);
    const linhas = r.itens!.map((l) => vis.map((c) => l.valores[c.chave] ?? ""));
    expect(linhas.every((l) => l[vis.findIndex((c) => c.chave === "atendimento|atendente")] === "Vinicius")).toBe(true);
    expect(linhas).toHaveLength(2);
  });
  it("filtro de quem vê soma ao fixo (Vinicius + canal X = 1)", () => {
    const r = itensTabela(base, tabela([vinicius]), P, [canalX], false);
    expect(r.itens!.map((i) => i.id)).toEqual(["a1"]);
  });
  it("atendimento sem atendente fica com a célula em branco", () => {
    const r = itensTabela(base, tabela(), P, [], false);
    expect(r.itens!.find((i) => i.id === "a4")!.valores["atendimento|atendente"]).toBe("");
  });
  it("bloco de contagem com o mesmo filtro dá o mesmo número que a tabela", () => {
    const c = cartaoSchema.parse({ id: "n", titulo: "N", tipo: "numero", fonte: "atendimento", filtros: [vinicius] });
    expect(agregarCartao(base, c, P, []).total).toBe(2);
  });
  it("selo mostra 'Atendente: Vinicius' e filtros inválidos são descartados", () => {
    expect(textoSelo(vinicius, "Atendente")).toBe("Atendente: Vinicius");
    expect(filtrosFixosValidos([vinicius, { foo: 1 }])).toEqual([vinicius]);
  });
});
