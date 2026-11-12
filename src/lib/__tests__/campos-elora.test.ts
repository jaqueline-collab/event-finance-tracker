import { describe, expect, it } from "vitest";
import { aplicarFiltrosCampos, catalogoVisivel, montarCatalogo, separarFiltros, type BaseCampos } from "../campos-elora";
import { agregarPainel } from "../painel-visual";
import { exigirEquipeConfig } from "../campos-elora.functions";
import { somarPadraoPorDia } from "../matriz";

const vazio: BaseCampos = { definicoes: [], contatos: [], atendimentos: [], cards: [] };
const campos = (g: ReturnType<typeof montarCatalogo>, f: string) => g.find((x) => x.fonte === f)?.campos.map((c) => c.campo) ?? [];

describe("Campos do Elora — catálogo", () => {
  it("cliente sem cards e sem classificação mostra só o que existe", () => {
    const g = montarCatalogo({
      ...vazio,
      contatos: [{ id: "c1", nome: "Ana", origem: "IMPORTED", criado_em: "2026-10-01T12:00:00Z" }],
      atendimentos: [{ id: "a1", contato_id: "c1", canal: "Canal 1", criado_em: "2026-10-01T12:00:00Z" }],
    });
    expect(g.map((x) => x.fonte)).toEqual(["contato", "atendimento"]);
    expect(campos(g, "atendimento")).not.toContain("classificacao");
    expect(campos(g, "atendimento")).not.toContain("equipe");
    expect(montarCatalogo(vazio)).toEqual([]);
  });

  it("dois clientes com campos personalizados diferentes veem catálogos diferentes", () => {
    const a = montarCatalogo({ ...vazio, cards: [{ id: "k1", contato_ids: [], cf: { "data-da-consulta": "2026-10-02" } }] });
    const b = montarCatalogo({ ...vazio, cards: [{ id: "k1", contato_ids: [], cf: { "indicacao": "Sim" } }] });
    expect(campos(a, "card")).toContain("campo.data-da-consulta");
    expect(campos(a, "card")).not.toContain("campo.indicacao");
    expect(campos(b, "card")).toContain("campo.indicacao");
  });

  it("campo removido no Elora sai do catálogo e os dados antigos continuam", () => {
    const contatos = [{ id: "c1", cf: { antigo: "x", novo: "y" } }];
    const antes = montarCatalogo({ ...vazio, contatos, definicoes: [{ key: "antigo", name: "Antigo", entityType: "CONTACT" }, { key: "novo", name: "Novo", entityType: "CONTACT" }] });
    const depois = montarCatalogo({ ...vazio, contatos, definicoes: [{ key: "novo", name: "Novo", entityType: "CONTACT" }] });
    expect(campos(antes, "contato")).toContain("campo.antigo");
    expect(campos(depois, "contato")).not.toContain("campo.antigo");
    expect(contatos[0].cf.antigo).toBe("x");
  });

  it("rótulo e oculto são por cliente; ocultos não são oferecidos", () => {
    const base = { ...vazio, cards: [{ id: "k1", contato_ids: [], cf: { "ag-ncia": "X" } }] };
    const g = montarCatalogo(base, [{ fonte: "card", campo: "campo.ag-ncia", rotulo: "Agência", oculto: true }]);
    const c = g[0].campos.find((x) => x.campo === "campo.ag-ncia")!;
    expect(c.rotulo).toBe("Agência");
    expect(catalogoVisivel(g).flatMap((x) => x.campos).some((x) => x.campo === "campo.ag-ncia")).toBe(false);
  });
});

describe("Filtro por campo", () => {
  const base: BaseCampos = {
    ...vazio,
    contatos: [
      { id: "c1", criado_em: "2026-10-01T15:00:00Z" },
      { id: "c2", criado_em: "2026-10-01T15:00:00Z" },
    ],
    atendimentos: [
      { id: "a1", contato_id: "c1", canal: "X", criado_em: "2026-10-01T15:00:00Z" },
      { id: "a2", contato_id: "c1", canal: "X", criado_em: "2026-10-01T16:00:00Z" },
      { id: "a3", contato_id: "c2", canal: "X", criado_em: "2026-10-01T16:00:00Z" },
    ],
    cards: [
      { id: "k1", contato_ids: ["c1"], etapa: "Agendados" },
      { id: "k2", contato_ids: ["c1"], etapa: "Agendados" },
      { id: "k3", contato_ids: ["c2"], etapa: "Perdido" },
    ],
  };

  it("campo de outra fonte (card) numa visão de atendimentos não duplica linhas", () => {
    const r = aplicarFiltrosCampos(base, [{ fonte: "card", campo: "etapa", op: "em", valores: ["Agendados"] }])!;
    expect([...r.contatos]).toEqual(["c1"]); // dois cards do mesmo contato: um contato
    const p = { de: "2026-10-01", ate: "2026-10-01" };
    const toP = {
      contatos: base.contatos.map((c) => ({ id: c.id, criado_em: c.criado_em!, origem: "X", etiquetas: [], campanha: null })),
      atendimentos: base.atendimentos.map((a) => ({ id: a.id, contato_id: a.contato_id, canal: a.canal!, atendente: "A", criado_em: a.criado_em!, tmr: null, tma: null })),
      mensagens: [],
    };
    const res = agregarPainel(toP, p, {}, r.contatos);
    expect(res.kpis.atual.novosLeads).toBe(1);
    expect(res.canais).toEqual([{ nome: "X", valor: 2 }]); // as 2 sessões de c1, nenhuma repetida
  });

  it("canal/atendente/equipe viram filtros comuns aplicados direto", () => {
    const { diretos, outros } = separarFiltros(
      [{ fonte: "atendimento", campo: "canal", op: "em", valores: ["X", "Y"] }, { fonte: "card", campo: "etapa", op: "vazio" }],
      { canal: { fonte: "atendimento", campo: "canal" } },
    );
    expect(diretos).toEqual({ canal: ["X", "Y"] });
    expect(outros).toHaveLength(1);
    const linhas = [{ dia: "2026-10-01", canal: "X", atendente: "", equipe: "", conversas_total_dia: 2 }, { dia: "2026-10-01", canal: "Z", atendente: "", equipe: "", conversas_total_dia: 5 }];
    expect(somarPadraoPorDia(linhas as any, { canal: ["X", "Y"] }).get("2026-10-01")!.conversas_total_dia.valor).toBe(2);
  });

  it("sem filtro por campo, o painel calcula igual a antes (painel do Gean não muda)", () => {
    const toP = {
      contatos: [{ id: "c1", criado_em: "2026-10-01T15:00:00Z", origem: "X", etiquetas: [], campanha: null }],
      atendimentos: [{ id: "a1", contato_id: "c1", canal: "X", atendente: "A", criado_em: "2026-10-01T15:00:00Z", tmr: null, tma: null }],
      mensagens: [],
    };
    const p = { de: "2026-10-01", ate: "2026-10-01" };
    expect(agregarPainel(toP, p, { canal: "X" }, null)).toEqual(agregarPainel(toP, p, { canal: "X" }));
    expect(agregarPainel(toP, p, { canal: ["X"] })).toEqual(agregarPainel(toP, p, { canal: "X" }));
    expect(aplicarFiltrosCampos(vazio, [])).toBeNull();
  });
});

describe("Permissão no servidor", () => {
  const db = (admin: boolean, interno: boolean) => ({ rpc: async (n: string) => ({ data: n === "is_admin" ? admin : n === "is_equipe_interna" ? interno : null }) });
  it("quem não é super admin nem equipe interna não edita o catálogo", async () => {
    await expect(exigirEquipeConfig(db(false, false))).rejects.toThrow(/acesso-negado/);
    await expect(exigirEquipeConfig(db(true, false))).resolves.toBeUndefined();
    await expect(exigirEquipeConfig(db(false, true))).resolves.toBeUndefined();
  });
});
