import { describe, expect, it } from "vitest";
import { formatarCelula, formatarDataHora, formatarMoeda, formatarTelefone, textoLink } from "@/lib/formatos";
import { cartaoSchema, itensTabela } from "@/lib/graficos";
import { NAO_DEFINIDO, normalizarValoresFiltro } from "@/lib/nao-definido";
import type { BaseCampos } from "@/lib/campos-elora";

const base: BaseCampos = {
  definicoes: [],
  contatos: [{ id: "c1", nome: null, telefone: null, status: null, etiquetas: [], origem: null, utm_source: null, utm_medium: null, utm_campaign: null, criado_em: "2026-10-02T12:00:00Z", cf: null, utm: null } as any],
  atendimentos: [],
  cards: [{ id: "k1", contato_ids: ["c1"], painel: null, etapa: null, fase: null, status: null, valor: null, criado_em: "2026-10-02T12:00:00Z", atualizado_em: null, cf: null } as any],
};

describe("Vazio em branco nas células, Sem informação nos agrupamentos", () => {
  it("formatadores: ausente, vazio ou inválido fica em branco", () => {
    for (const v of [null, undefined, "", "NaN", Number.NaN, "undefined", "Invalid Date", "abc"]) expect(formatarMoeda(v)).toBe("");
    expect(formatarMoeda(0)).toBe("R$ 0,00");
    for (const v of [null, "", "NaN", "2026-13-45T99:99"]) expect(formatarDataHora(v)).toBe("");
    for (const v of [null, "", "undefined", "sem número"]) expect(formatarTelefone(v)).toBe("");
    expect(textoLink("")).toBe("");
    expect(formatarCelula("valor", "Não definido")).toBe("");
  });
  it("tabela de itens: linha com todos os campos vazios e card sem valor sai em branco (sem NaN)", () => {
    const cfg = cartaoSchema.parse({ id: "t", titulo: "T", tipo: "tabela_itens", fonte: "card", colunas: [{ fonte: "contato", campo: "nome" }, { fonte: "contato", campo: "telefone" }, { fonte: "card", campo: "valor" }, { fonte: "card", campo: "etapa" }] });
    const r = itensTabela(base, cfg, { de: "2026-10-01", ate: "2026-10-31" }, [], false, []);
    const v = r.itens![0].valores;
    for (const k of Object.keys(v)) expect(v[k]).toBe("");
    expect(JSON.stringify(v)).not.toMatch(/NaN|undefined|Não definido|Sem informação|—/);
  });
  it("exportar: célula vazia sai vazia no CSV", () => {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const cfg = cartaoSchema.parse({ id: "t", titulo: "T", tipo: "tabela_itens", fonte: "card", colunas: [{ fonte: "card", campo: "valor" }] });
    const r = itensTabela(base, cfg, { de: "2026-10-01", ate: "2026-10-31" }, [], false, []);
    const linha = r.colunasItens!.map((c) => esc(r.itens![0].valores[c.chave] ?? "")).join(";");
    expect(linha).toBe('"";""');
  });
  it("agrupamento usa o rótulo curto e filtro antigo continua valendo", () => {
    expect(NAO_DEFINIDO).toBe("Sem informação");
    expect(normalizarValoresFiltro(["Não definido", "X"])).toEqual(["Sem informação", "X"]);
  });
});
