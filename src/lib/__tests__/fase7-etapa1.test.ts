import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { agregarPainel } from "../painel-visual";
import { CARTOES_KPI, CARTOES_PAINEL, cartaoDoPainel, cartaoSchema, diasAguardando, ehTituloPadrao, funilTop, migrarKpisVisao, tituloPadrao } from "../graficos";

const ler = (f: string) => readFileSync(f, "utf8");
const p = { de: "2026-10-01", ate: "2026-10-02" };
const base = {
  contatos: [{ id: "a", criado_em: "2026-10-01T15:00:00Z", origem: "A", etiquetas: [], campanha: "C" }],
  atendimentos: [{ id: "s", contato_id: "a", criado_em: "2026-10-01T15:00:00Z", canal: "Canal", atendente: "Pessoa", tmr: 30, tma: 60 }],
  mensagens: [{ sessao_id: "s", enviada_em: "2026-10-01T15:00:00Z", tipo: "TEXT", origem: "DEFAULT" }],
};

describe("Etapa 1: nenhum cartão de número fora dos blocos da visão", () => {
  it("o painel não tem mais cabeçalho fixo de indicadores", () => {
    const painel = ler("src/components/painel-visual.tsx");
    expect(painel).not.toMatch(/function Indicadores|CartaoIndicador|kpisNaGrade/);
    expect(ler("src/routes/area-do-cliente.index.tsx")).not.toMatch(/kpisNaGrade/);
  });
  it("a Matriz não renderiza cartão de número", () => {
    expect(ler("src/components/matriz-cliente.tsx")).not.toMatch(/CartaoIndicador|tipo === "numero"/);
  });
});

describe("Etapa 1: TMR e TMA em dois blocos", () => {
  it("cada um tem o valor do cálculo do painel e a sua amostra", () => {
    const r = agregarPainel(base as any, p, {});
    const tmr = cartaoDoPainel(r, CARTOES_KPI.find((c) => c.painel === "kpi-tmr")!);
    const tma = cartaoDoPainel(r, CARTOES_KPI.find((c) => c.painel === "kpi-tma")!);
    expect(tmr.total).toBe(r.kpis.atual.tmr.valor);
    expect(tma.total).toBe(r.kpis.atual.tma.valor);
    expect(tmr.rodape).toBe(`${r.kpis.atual.tmr.medidas} conversas medidas`);
    expect(tma.rodape).toBe(`${r.kpis.atual.tma.medidas} conversas medidas`);
  });
});

describe("Etapa 1: migração dos indicadores", () => {
  const cal = cartaoSchema.parse({ id: "cal", titulo: "Agendamentos", tipo: "calendario", fonte: "card" });
  it("visão sem indicadores recebe os 5 no topo, 3 colunas cada, sem remover blocos", () => {
    const m = migrarKpisVisao([cal]);
    expect(m.map((c) => c.painel ?? c.id)).toEqual(["kpi-leads", "kpi-conversas", "kpi-tmr", "kpi-ads", "kpi-tma", "cal"]);
    expect(m.slice(0, 5).every((c) => c.largura === 3)).toBe(true);
  });
  it("visão com 'TMR · TMA' vira TMR + TMA, mantendo todos os blocos", () => {
    const antigo = [...CARTOES_KPI.filter((c) => c.painel !== "kpi-tma").map((c) => (c.painel === "kpi-tmr" ? { ...c, titulo: "TMR · TMA" } : c)), ...CARTOES_PAINEL];
    const m = migrarKpisVisao(antigo);
    expect(m.length).toBe(antigo.length + 1);
    expect(m.find((c) => c.painel === "kpi-tmr")?.titulo).toBe("TMR");
    expect(m[4].painel).toBe("kpi-tma");
    expect(migrarKpisVisao(m)).toEqual(m);
  });
  it("os números dos blocos migrados são os do cabeçalho de antes", () => {
    const r = agregarPainel(base as any, p, {});
    const v = Object.fromEntries(migrarKpisVisao([cal]).filter((c) => c.painel).map((c) => [c.painel, cartaoDoPainel(r, c).total]));
    expect(v["kpi-leads"]).toBe(r.kpis.atual.novosLeads);
    expect(v["kpi-conversas"]).toBe(r.kpis.atual.conversas);
    expect(v["kpi-ads"]).toBe(r.kpis.atual.leadsAds);
  });
});

describe("Etapa 1: funil e calendário", () => {
  it("funil mostra as 8 maiores e soma o resto em 'Outras' sem mudar o total", () => {
    const l = Array.from({ length: 11 }, (_, i) => ({ rotulo: `c${i}`, total: i + 1 }));
    const f = funilTop(l, 8);
    expect(f.length).toBe(9);
    expect(f[8]).toEqual({ rotulo: "Outras", total: 1 + 2 + 3 });
    expect(f.reduce((a, b) => a + b.total, 0)).toBe(66);
  });
  it("dia futuro nunca é 'sem cobertura'", () => {
    const d = diasAguardando({ de: "2026-11-10", ate: "2026-11-15" }, { categorias: [], estimados: [] }, () => "parcial", "2026-11-12");
    expect(d).toEqual(["2026-11-10", "2026-11-11", "2026-11-12"]);
  });
  it("dia confirmado sem registro fica vazio (não é marcado)", () => {
    expect(diasAguardando(p, { categorias: [], estimados: [] }, () => "confirmado", "2026-12-01")).toEqual([]);
  });
  it("calendário novo tem título padrão 'Agendamentos'", () => {
    expect(tituloPadrao("calendario")).toBe("Agendamentos");
    expect(ehTituloPadrao("Novo gráfico")).toBe(true);
    expect(ehTituloPadrao("Minha agenda")).toBe(false);
  });
});

describe("Etapa 1: variação com tokens da marca", () => {
  it("usa sucesso, destrutivo e neutro, nunca o azul da marca", () => {
    const s = ler("src/components/cartoes-graficos.tsx");
    expect(s).toMatch(/text-success/);
    expect(s).not.toMatch(/bom \? "text-primary"/);
  });
});
