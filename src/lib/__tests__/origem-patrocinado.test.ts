import { describe, expect, it } from "vitest";
import { condicaoOrigemPatrocinado, ehOrigemPatrocinada, origemPatrocinadoValida } from "../origem-patrocinado";
import { preservarDataClassificacao } from "../classificacao-data";
import { calcularIndicadoresContatos, calcularIndicadoresConversas, type ContatoIndicador, type ConversaIndicador } from "../indicadores-motor";

const config = { campo: "campo.origem", patrocinados: ["Anúncio A", "Anúncio B"] };
const contato = (id: string, origem: unknown, criado_em = "2026-11-24T15:00:00Z"): ContatoIndicador => ({
  id,
  criado_em,
  origem: "CHAT",
  cf: { origem },
});
const coluna = (chave: string, itens: any[] = [], fonte: "contatos" | "conversas" = "contatos") => ({
  chave,
  nome: chave,
  fonte,
  medida: "contagem" as const,
  evento: fonte === "contatos" ? { tipo: "foi_criado" as const } : { tipo: "foi_classificado" as const },
  condicoes: { op: "E" as const, itens },
  ordem: 1,
  tipo: "combinada" as const,
  ativo: true,
});

 describe("Origem patrocinada por cliente", () => {
  it("aceita Meta ADS como um valor patrocinado qualquer, sem nome de cliente no código", () => {
    const cfg = origemPatrocinadoValida({ campo: "campo.origem", patrocinados: ["Meta ADS"] });
    expect(ehOrigemPatrocinada(["Meta ADS"], cfg)).toBe(true);
    expect(ehOrigemPatrocinada(["Orgânico"], cfg)).toBe(false);
  });
  it("vazio e valor novo são não patrocinados", () => {
    expect(ehOrigemPatrocinada(null, config)).toBe(false);
    expect(ehOrigemPatrocinada("Valor novo", config)).toBe(false);
  });
  it("configuração inválida não classifica nada como patrocinado", () => {
    expect(origemPatrocinadoValida({ campo: "", patrocinados: [] })).toBeNull();
    expect(ehOrigemPatrocinada("Anúncio A", null)).toBe(false);
  });
  it("a coluna referencia a lista dinâmica, não uma cópia dos valores", () => {
    expect(condicaoOrigemPatrocinado("campo.origem", true)).toEqual({
      campo: { fonte: "contato", campo: "campo.origem" }, operador: "em", lista: "origem_patrocinado",
    });
  });
});

describe("Relatório por contatos e classificação da conversa", () => {
  const campo = { fonte: "contato" as const, campo: "campo.origem" };
  it("soma Origens + Sem informação = total; patrocinado + não patrocinado = total", () => {
    const contatos = [contato("1", ["Anúncio A"]), contato("2", ["Orgânico"]), contato("3", null), contato("4", ["Valor novo"])];
    const regras = [
      coluna("total"),
      coluna("ads", [{ campo, operador: "igual", valor: "Anúncio A" }]),
      coluna("organico", [{ campo, operador: "igual", valor: "Orgânico" }]),
      coluna("sem", [{ campo, operador: "vazio" }]),
      coluna("novo", [{ campo, operador: "igual", valor: "Valor novo" }]),
      coluna("pat", [condicaoOrigemPatrocinado("campo.origem", true)]),
      coluna("npat", [condicaoOrigemPatrocinado("campo.origem", false)]),
    ];
    const m = calcularIndicadoresContatos(regras, contatos, new Map(), { origem_patrocinado: config.patrocinados });
    const d = m.get("2026-11-24")!;
    expect(d.total.valor).toBe(4);
    expect(d.ads.valor + d.organico.valor + d.sem.valor + d.novo.valor).toBe(4);
    expect(d.pat.valor).toBe(1);
    expect(d.npat.valor).toBe(3);
    expect(d.pat.valor + d.npat.valor).toBe(4);
  });
  it("agendamento conta na data da classificação e usa a Origem do contato ligado", () => {
    const contatos = [contato("c1", ["Anúncio A"]), contato("c2", null)];
    const conversas: ConversaIndicador[] = [
      { id: "a1", contato_id: "c1", classificacao: "Conversão", classificado_em: "2026-11-24T02:30:00Z" },
      { id: "a2", contato_id: "c2", classificacao: "Conversão", classificado_em: "2026-11-24T15:00:00Z" },
      { id: "a3", contato_id: "c1", classificacao: "Outra", classificado_em: "2026-11-24T15:00:00Z" },
    ];
    const conversao = { campo: { fonte: "atendimento" as const, campo: "classificacao" }, operador: "igual" as const, valor: "Conversão" };
    const m = calcularIndicadoresConversas([
      coluna("total", [conversao], "conversas"),
      coluna("sem", [conversao, { campo, operador: "vazio" }], "conversas"),
      coluna("pat", [conversao, condicaoOrigemPatrocinado("campo.origem", true)], "conversas"),
      coluna("npat", [conversao, condicaoOrigemPatrocinado("campo.origem", false)], "conversas"),
    ], conversas, contatos, new Map(), { origem_patrocinado: config.patrocinados });
    // 02:30 UTC = 23/11 em Brasília.
    expect(m.get("2026-11-23")?.total.valor).toBe(1);
    expect(m.get("2026-11-23")?.pat.valor).toBe(1);
    expect(m.get("2026-11-24")?.total.valor).toBe(1);
    expect(m.get("2026-11-24")?.sem.valor).toBe(1);
    expect(m.get("2026-11-24")?.npat.valor).toBe(1);
  });
});

describe("data da classificação", () => {
  it("outra atualização da conversa não muda a data da mesma classificação", () => {
    const [r] = preservarDataClassificacao(
      [{ externo_id: "a", classificacao: "Conversão", classificado_em: "2026-11-25T10:00:00Z" }],
      [{ externo_id: "a", classificacao: "Conversão", classificado_em: "2026-11-24T10:00:00Z" }],
    );
    expect(r.classificado_em).toBe("2026-11-24T10:00:00Z");
  });
  it("classificação nova recebe a data nova do Elora", () => {
    const [r] = preservarDataClassificacao(
      [{ externo_id: "a", classificacao: "Conversão", classificado_em: "2026-11-25T10:00:00Z" }],
      [{ externo_id: "a", classificacao: "Outra", classificado_em: "2026-11-24T10:00:00Z" }],
    );
    expect(r.classificado_em).toBe("2026-11-25T10:00:00Z");
  });
});
