import { expect, it } from "vitest";
import type { BaseCampos } from "../campos-elora";
import { agregarDoisValores, cartaoSchema, itensTabela } from "../graficos";

const per = { de: "2026-11-01", ate: "2026-11-25" };
const base: BaseCampos = {
  definicoes: [], cards: [], contatos: [{ id: "c1", nome: "Cliente fictício" }],
  atendimentos: [
    ...[0, 400].map((valor, i) => ({ id: `consulta-${i}`, contato_id: "c1", valor, classificacao: "Consulta Agendada", encerrado_em: "2026-11-09T17:24:35Z", criado_em: "2026-10-01T12:00:00Z", classificado_em: "2026-11-26T12:00:00Z" })),
    ...[990, 55, 90, 0, 149].map((valor, i) => ({ id: `procedimento-${i}`, contato_id: "c1", valor, classificacao: "Procedimento Vendido", encerrado_em: "2026-11-26T02:59:59Z", criado_em: "2026-10-01T12:00:00Z" })),
    { id: "fora", contato_id: "c1", valor: 999, classificacao: "Procedimento Vendido", encerrado_em: "2026-11-26T03:00:00Z" },
  ],
};
const cfg = (valores: string[]) => cartaoSchema.parse({ id: "b", titulo: "B", tipo: "dois_valores", fonte: "atendimento", formato: "moeda", campoMedida: { fonte: "atendimento", campo: "valor" }, camposData: [{ fonte: "atendimento", campo: "encerrado_em" }], filtros: [{ fonte: "atendimento", campo: "classificacao", op: "em", valores }] });
it("consultas usam conclusão e valor da conversa: 2 e R$400", () => {
  const r = agregarDoisValores(base, cfg(["Consulta Agendada"]), per);
  expect(r.qtd).toBe(2); expect(r.total).toBe(400);
});
it("procedimentos respeitam Brasília: 5 e R$1284", () => {
  const r = agregarDoisValores(base, cfg(["Procedimento Vendido"]), per);
  expect(r.qtd).toBe(5); expect(r.total).toBe(1284);
});
it("tabela inclui sete conversas, somando R$1684, inclusive zero real", () => {
  const c = cfg(["Consulta Agendada", "Procedimento Vendido"]);
  const r = itensTabela(base, { ...c, tipo: "tabela_itens", colunas: [{ fonte: "atendimento", campo: "valor" }] }, per, [], false);
  expect(r.itens).toHaveLength(7);
  expect(r.itens?.reduce((s, x) => s + Number(x.brutos?.["atendimento|valor"]), 0)).toBe(1684);
  expect(r.itens?.find(x => x.id === "consulta-0")?.brutos?.["atendimento|valor"]).toBe("0");
});