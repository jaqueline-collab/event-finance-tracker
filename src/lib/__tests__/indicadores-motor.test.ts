import { describe, expect, it } from "vitest";
import {
  calcularIndicadoresCards,
  calcularPadrao,
  colunasDoCliente,
  montarRelatorio,
  type IndicadorConfig,
  type Leitura,
} from "../indicadores-motor";

const cfg = (p: Partial<IndicadorConfig>): IndicadorConfig => ({
  chave: "x",
  nome: "X",
  fonte: "cards",
  medida: "contagem",
  evento: { tipo: "entrou_etapa", etapa: "Agendados" },
  condicoes: { op: "E", itens: [] },
  ordem: 0,
  tipo: "app",
  ativo: true,
  ...p,
});
const leitura = (p: Partial<Leitura>): Leitura => ({
  card_id: "c1",
  visto_em: "2026-10-01T15:00:00Z",
  estimado: false,
  etapa_id: "s1",
  etapa_titulo: "Pendente",
  status: "OPEN",
  criado_em: "2026-09-30T15:00:00Z",
  campos: {},
  ...p,
});

describe("motor de indicadores", () => {
  it("dois clientes com regras diferentes não se misturam", () => {
    const ls = [leitura({ etapa_titulo: "Agendados" })];
    const a = calcularIndicadoresCards([cfg({ chave: "ag", evento: { tipo: "entrou_etapa", etapa: "Agendados" } })], ls);
    const b = calcularIndicadoresCards([cfg({ chave: "ganho", evento: { tipo: "virou_ganho" } })], ls);
    expect(a.get("2026-10-01")?.ag.valor).toBe(1);
    expect(b.get("2026-10-01")).toBeUndefined();
  });

  it("entrou na etapa conta no primeiro dia em São Paulo, uma vez só", () => {
    const ls = [
      leitura({ visto_em: "2026-10-01T12:00:00Z" }),
      leitura({ visto_em: "2026-10-03T02:30:00Z", etapa_titulo: "Agendados" }), // 02/10 23:30 em SP
      leitura({ visto_em: "2026-10-04T12:00:00Z", etapa_titulo: "Agendados", campos: { a: 1 } }),
    ];
    const m = calcularIndicadoresCards([cfg({ chave: "ag" })], ls);
    expect(m.get("2026-10-02")?.ag.valor).toBe(1);
    expect(m.get("2026-10-04")).toBeUndefined();
  });

  it("campo preenchido conta no dia em que a condição passa a valer", () => {
    const c = cfg({ chave: "pv", condicoes: { op: "E", itens: [{ campo: { fonte: "contato", campo: "campo.data-procedimento" }, operador: "preenchido" }] } });
    const ls = [
      leitura({ visto_em: "2026-10-01T15:00:00Z", etapa_titulo: "Agendados" }),
      leitura({ visto_em: "2026-10-05T15:00:00Z", etapa_titulo: "Agendados", campos: { "contato.campo.data-procedimento": ["2026-10-15"] } }),
    ];
    const m = calcularIndicadoresCards([c], ls);
    expect(m.get("2026-10-01")).toBeUndefined();
    expect(m.get("2026-10-05")?.pv.valor).toBe(1);
  });

  it("versão ADS só conta com utm.campaign preenchido", () => {
    const ads = cfg({ chave: "ads", condicoes: { op: "E", itens: [{ campo: { fonte: "utm", campo: "campaign" }, operador: "preenchido" }] } });
    const ls = [
      leitura({ card_id: "a", etapa_titulo: "Agendados", campos: { "contato.utm_campaign": "promo" } }),
      leitura({ card_id: "b", etapa_titulo: "Agendados", campos: { "contato.utm_campaign": "" } }),
    ];
    expect(calcularIndicadoresCards([ads], ls).get("2026-10-01")?.ads.valor).toBe(1);
  });

  it("primeira leitura sai marcada como estimado e o total carrega a marca", () => {
    const m = calcularIndicadoresCards([cfg({ chave: "ag" })], [leitura({ etapa_titulo: "Agendados", estimado: true })]);
    expect(m.get("2026-10-01")?.ag).toEqual({ valor: 1, estimado: 1 });
    const { total } = montarRelatorio(m, ["2026-10-01", "2026-10-02"], ["ag"]);
    expect(total.ag).toEqual({ valor: 1, estimado: 1 });
  });

  it("cliente sem configuração mostra só as colunas padrão", () => {
    expect(colunasDoCliente([]).map((c) => c.chave)).toEqual([
      "novos_contatos",
      "novos_contatos_ads",
      "conversas_total_dia",
      "conversas_usuario",
      "conversas_bot",
    ]);
  });

  it("novos contatos ignoram IMPORTED", () => {
    const m = calcularPadrao(
      [
        { criado_em: "2026-10-01T15:00:00Z", origem: "IMPORTED", utm_campaign: null },
        { criado_em: "2026-10-01T15:00:00Z", origem: "CREATED_FROM_HUB", utm_campaign: "x" },
      ],
      [],
    );
    expect(m.get("2026-10-01")?.novos_contatos.valor).toBe(1);
    expect(m.get("2026-10-01")?.novos_contatos_ads.valor).toBe(1);
  });
});
