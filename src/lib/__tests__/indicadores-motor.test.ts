import { describe, expect, it } from "vitest";
import {
  calcularIndicadoresCards,
  calcularPadrao,
  camposDaLeitura,
  calcularPadraoPorCorte,
  errosDeConfig,
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

describe("fonte do campo vem da configuração", () => {
  // mesmo card visto pelos dois clientes: campo preenchido só no card
  const ls = [
    leitura({ etapa_titulo: "Agendados", campos: { "card.campo.data-da-consulta": "2026-10-10", "contato.campo.data-da-consulta": null } }),
  ];
  const regra = (fonte: "card" | "contato") =>
    cfg({ chave: "ca", condicoes: { op: "E", itens: [{ campo: { fonte, campo: "campo.data-da-consulta" }, operador: "preenchido" }] } });

  it("dois clientes, mesma regra, fontes diferentes, resultados diferentes", () => {
    const clienteCard = calcularIndicadoresCards([regra("card")], ls);
    const clienteContato = calcularIndicadoresCards([regra("contato")], ls);
    expect(clienteCard.get("2026-10-01")?.ca.valor).toBe(1);
    expect(clienteContato.get("2026-10-01")?.ca).toBeUndefined();
  });

  it("campo do contato usa o primeiro contato do card", () => {
    const card = { customFields: {}, contactIds: ["p1", "p2"] };
    const primeiro = { payload: { customFields: { "data-da-consulta": "2026-10-10" } } };
    const campos = camposDaLeitura(card, primeiro);
    expect(campos["contato.campo.data-da-consulta"]).toBe("2026-10-10");
  });

  it("condição sem fonte não conta e vira erro de configuração", () => {
    const antiga = cfg({ chave: "old", condicoes: { op: "E", itens: [{ campo: "card.campo.data-da-consulta" as any, operador: "preenchido" }] } });
    expect(errosDeConfig(antiga)).toHaveLength(1);
    expect(calcularIndicadoresCards([antiga], ls).get("2026-10-01")).toBeUndefined();
  });
});

describe("colunas padrão por canal/atendente/equipe", () => {
  const cfgCorte = { nomeCanal: { c1: "(31) 1111" }, equipePorCanal: { c1: "Atendimento" }, agentes: { u1: "Ana", u2: "Bia" }, ignorarAtendentes: [] as string[] };
  const sessoes = [
    { id: "s1", contato_id: "k1", canal_id: "c1", canal_nome: null, responsavel_id: "u2", responsavel_nome: "Bia" },
    { id: "s2", contato_id: "k2", canal_id: "c2", canal_nome: "@insta", responsavel_id: null, responsavel_nome: null },
  ];
  const msgs = [
    { sessao_id: "s1", enviada_em: "2026-09-25T13:00:00Z", tipo: "TEXT", origem: "DEFAULT", user_id: "u1" },
    { sessao_id: "s1", enviada_em: "2026-09-25T14:00:00Z", tipo: "TEXT", origem: "GATEWAY", user_id: null },
    { sessao_id: "s2", enviada_em: "2026-09-25T15:00:00Z", tipo: "TEXT", origem: "BOT", user_id: "u1" },
  ];
  const contatos = [
    { id: "k1", criado_em: "2026-09-25T12:00:00Z", origem: "CHAT", utm_campaign: "x" },
    { id: "k9", criado_em: "2026-09-25T12:00:00Z", origem: "CHAT", utm_campaign: null },
  ];
  it("soma das linhas = total do dia", () => {
    const L = calcularPadraoPorCorte(contatos, msgs, sessoes, cfgCorte);
    expect(L.reduce((a, l) => a + l.conversas_total_dia, 0)).toBe(2);
    expect(L.reduce((a, l) => a + l.novos_contatos, 0)).toBe(2);
  });
  it("atendente = última mensagem humana; sem humana usa responsável ou vazio", () => {
    const L = calcularPadraoPorCorte(contatos, msgs, sessoes, cfgCorte);
    expect(L.find((l) => l.canal === "(31) 1111")?.atendente).toBe("Ana");
    expect(L.find((l) => l.canal === "@insta")?.atendente).toBe("");
  });
  it("canal sem mapa de equipe fica com equipe vazia", () => {
    const L = calcularPadraoPorCorte(contatos, msgs, sessoes, cfgCorte);
    expect(L.find((l) => l.canal === "@insta")?.equipe).toBe("");
    expect(L.find((l) => l.canal === "(31) 1111")?.equipe).toBe("Atendimento");
  });
  it("atendente ignorado tira a conversa", () => {
    const L = calcularPadraoPorCorte(contatos, msgs, sessoes, { ...cfgCorte, ignorarAtendentes: ["Ana"] });
    expect(L.reduce((a, l) => a + l.conversas_total_dia, 0)).toBe(1);
  });
});
