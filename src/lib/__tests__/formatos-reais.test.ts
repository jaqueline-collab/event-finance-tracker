import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { formatarCelula, formatarDataHora, formatarTelefone } from "../formatos";
import { CANAL_SEM_NOME, montarMapaCanais, exibirCanal, nomeCanalExibido } from "../nome-canal";
import { cartaoSchema, itensDoDia, itensTabela } from "../graficos";

const cfg = (x: Record<string, unknown>) => cartaoSchema.parse({ id: "x", titulo: "X", tipo: "tabela_itens", fonte: "card", ...x });
const base = {
  definicoes: [],
  contatos: [{ id: "k1", nome: "Viviane", telefone: "+55|31992180936", canal: "Instância decc86", criado_em: "2026-09-01T12:00:00Z", cf: { "data-procedimento": "" } }],
  atendimentos: [],
  cards: [{ id: "c1", contato_ids: ["k1"], valor: 10990, criado_em: "2026-09-01T12:00:00Z", cf: { "data-da-consulta": "", "data-do-procedimento": "2026-09-30T11:00:00.0000000-03:00", "procedimento-34": "Rinoplastia" } }],
} as any;

describe("formatos reais do Elora", () => {
  it("telefone com barra", () => {
    expect(formatarTelefone("+55|31992180936")).toBe("(55) 31 99218-0936");
    expect(formatarCelula("qualquer", "+55|31992180936")).toBe("(55) 31 99218-0936");
  });
  it("data com 7 casas decimais e fuso", () => {
    expect(formatarDataHora("2026-09-30T11:00:00.0000000-03:00")).toBe("30/09/2026 11:00");
  });
  it("canal 'Instância <código>' conta como sem apelido", () => {
    expect(nomeCanalExibido("Instância decc86")).toBe(CANAL_SEM_NOME);
    expect(formatarCelula("canal", "Instância decc86")).toBe(CANAL_SEM_NOME);
    const m = montarMapaCanais([{ id: "decc86", nomes: ["Instância decc86"] }], { decc86: "Instância decc86" });
    expect(exibirCanal(m, "decc86")).toBe(CANAL_SEM_NOME);
  });
  it("na tabela renderizada os três formatos aparecem já tratados", () => {
    const c = cfg({ colunas: [{ fonte: "contato", campo: "telefone" }, { fonte: "card", campo: "campo.data-do-procedimento" }, { fonte: "contato", campo: "canal" }] });
    const linha = itensTabela(base, c, { de: "2026-09-01", ate: "2026-09-30" }, [], false).itens?.[0]?.valores ?? {};
    const vals = Object.values(linha);
    expect(vals).toContain("(55) 31 99218-0936");
    expect(vals).toContain("30/09/2026 11:00");
    expect(vals).not.toContain("Instância decc86");
  });
});

describe("lista do dia do Calendário", () => {
  const cal = cfg({
    tipo: "calendario",
    dimensao: { fonte: "card", campo: "campo.data-da-consulta" },
    camposData: [{ fonte: "card", campo: "campo.data-do-procedimento" }],
    camposLista: [{ fonte: "contato", campo: "campo.data-procedimento" }, { fonte: "card", campo: "campo.procedimento-34", rotulo: "Procedimento de interesse" }, { fonte: "card", campo: "valor", rotulo: "Valor do card" }],
  });
  it("procedimento mostra a data e hora do próprio compromisso, nunca 'Não definido'", () => {
    const [i] = itensDoDia(base, cal, "2026-09-30", [], false);
    expect(i.tipo).toBe(1);
    expect(i.data).toBe("30/09/2026 11:00");
    expect(Object.values(i.campos)).not.toContain("Não definido");
  });
  it("traz procedimento de interesse e valor do card; sem permissão o valor some", () => {
    const [i] = itensDoDia(base, cal, "2026-09-30", [], false);
    expect(i.campos["card|campo.procedimento-34"]).toBe("Rinoplastia");
    expect(i.campos["card|valor"]).toBe("R$ 10.990,00");
    expect(itensDoDia(base, cal, "2026-09-30", [], true)[0].campos["card|valor"]).toBeUndefined();
  });
});

describe("contraste", () => {
  it("menu ativo usa amarelo com texto marinho (nunca branco sobre amarelo)", () => {
    for (const f of ["src/components/app-sidebar.tsx", "src/components/area-externa-layout.tsx"]) {
      const s = readFileSync(f, "utf8");
      expect(s).toContain("data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground");
      expect(s).not.toContain("data-[active=true]:bg-brand-soft");
    }
  });
});
