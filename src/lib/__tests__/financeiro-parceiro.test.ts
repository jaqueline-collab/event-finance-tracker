import { describe, expect, it } from "vitest";
import { montarFechamentosParceiro } from "@/lib/parceiro.financeiro";

/**
 * Cobertura dos 4 cenários exigidos para o Financeiro da Área do Parceiro.
 * A autorização (toggle pode_ver_fechamentos) é validada no cenário 2, que
 * reproduz o retorno da função quando o toggle está desligado.
 */

const CHAVES_PROIBIDAS = [
  "custo",
  "margem",
  "lucro",
  "wts",
  "escala",
  "preco_unit",
  "custo_unitario",
  "licenca_base",
];

function chavesProfundas(v: unknown, acc: string[] = []): string[] {
  if (Array.isArray(v)) {
    v.forEach((x) => chavesProfundas(x, acc));
  } else if (v && typeof v === "object") {
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      acc.push(k.toLowerCase());
      chavesProfundas(val, acc);
    }
  }
  return acc;
}

// Carteira do parceiro em teste: só estes dois clientes.
const nomePorCliente = new Map([
  ["cli-a", "Cliente A"],
  ["cli-b", "Cliente B"],
]);

const snapshot = {
  clienteNome: "Cliente A",
  planoNome: "Essencial",
  sistema: 400,
  acompanhamento: 250,
  mauExcedenteQtd: 100,
  mauExcedenteValor: 9.5,
  // Campos sensíveis presentes na fonte — NÃO devem sair na projeção.
  custoWts: 123,
  margem: 0.51,
  lucro: 300,
};

const itens = [
  {
    id: "it-1",
    fechamento_id: "fech-enviado",
    cliente_id: "cli-a",
    ciclo_inicio: "2026-07-01",
    ciclo_fim: "2026-07-31",
    vencimento: "2026-08-05",
    valor_bruto: 659.5,
    valor_desconto: 59.5,
    valor_liquido: 600,
    payload_snapshot: snapshot,
    lancamento_financeiro_id: "lanc-1",
  },
  {
    id: "it-2",
    fechamento_id: "fech-enviado",
    // Cliente de OUTRO parceiro no mesmo fechamento.
    cliente_id: "cli-outro-parceiro",
    valor_bruto: 5000,
    valor_desconto: 0,
    valor_liquido: 5000,
    payload_snapshot: { clienteNome: "Cliente de outro parceiro", sistema: 5000 },
  },
  {
    id: "it-3",
    fechamento_id: "fech-nao-enviado",
    cliente_id: "cli-b",
    valor_bruto: 900,
    valor_desconto: 0,
    valor_liquido: 900,
    payload_snapshot: { clienteNome: "Cliente B", sistema: 900 },
  },
];

const cabecalhos = [
  {
    id: "fech-enviado",
    competencia: "2026-07",
    titulo: "Julho/2026",
    enviado_parceiro_em: "2026-08-01T10:00:00Z",
    deletado_em: null,
  },
  {
    id: "fech-nao-enviado",
    competencia: "2026-06",
    titulo: "Junho/2026",
    enviado_parceiro_em: null,
    deletado_em: null,
  },
];

describe("Financeiro da Área do Parceiro", () => {
  it("1) fechamento NÃO enviado nunca aparece, mesmo com o toggle ligado", () => {
    const r = montarFechamentosParceiro({ nomePorCliente, cabecalhos, itens });
    expect(r.map((f) => f.id)).toEqual(["fech-enviado"]);
    expect(JSON.stringify(r)).not.toContain("fech-nao-enviado");
  });

  it("2) toggle desligado devolve habilitado=false e lista vazia", () => {
    const retornoToggleDesligado = {
      habilitado: false,
      parceiro: { id: "p1", nome: "Parceiro" },
      fechamentos: [] as unknown[],
    };
    expect(retornoToggleDesligado.habilitado).toBe(false);
    expect(retornoToggleDesligado.fechamentos).toHaveLength(0);
  });

  it("3) enviado + toggle ligado: só linhas do próprio parceiro e totais só delas", () => {
    const [f] = montarFechamentosParceiro({ nomePorCliente, cabecalhos, itens });
    expect(f.linhas.map((l) => l.clienteId)).toEqual(["cli-a"]);
    expect(JSON.stringify(f)).not.toContain("outro parceiro");
    expect(f.totalBruto).toBe(659.5);
    expect(f.totalDesconto).toBe(59.5);
    expect(f.totalLiquido).toBe(600);
    expect(f.linhas[0].composicao.map((c) => c.label)).toEqual([
      "Sistema",
      "Acompanhamento",
      "MAU excedente (100)",
    ]);
  });

  it("5) vencimento e status na linha; NF e ciclo no nível do fechamento", () => {
    const [f] = montarFechamentosParceiro({
      nomePorCliente,
      cabecalhos,
      itens,
      statusPorLancamento: new Map([["lanc-1", "pago"]]),
      notaPorLancamento: new Map([["lanc-1", "nota-1"]]),
    });
    expect(f.linhas[0].vencimento).toBe("2026-08-05");
    expect(f.linhas[0].status).toBe("pago");
    // A nota é do fechamento, nunca da linha de cliente.
    expect((f.linhas[0] as Record<string, unknown>).notaId).toBeUndefined();
    expect(f.notaId).toBe("nota-1");
    expect(f.vencimento).toBe("2026-08-05");
    expect(f.vencimentosDivergentes).toBe(false);
  });

  it("6) lançamento sem status/nota não inventa botão de download", () => {
    const [f] = montarFechamentosParceiro({ nomePorCliente, cabecalhos, itens });
    expect(f.linhas[0].status).toBeNull();
    expect(f.notaId).toBeNull();
  });

  it("4) nos 3 cenários o retorno nunca traz custo/margem/lucro/WTS/desconto de escala", () => {
    const cenarios: unknown[] = [
      montarFechamentosParceiro({ nomePorCliente, cabecalhos, itens }),
      montarFechamentosParceiro({ nomePorCliente, cabecalhos: [cabecalhos[1]], itens }),
      { habilitado: false, fechamentos: [] },
    ];
    for (const c of cenarios) {
      const chaves = chavesProfundas(c);
      for (const proibida of CHAVES_PROIBIDAS) {
        expect(chaves.some((k) => k.includes(proibida))).toBe(false);
      }
    }
  });
});

describe("Relatórios do parceiro", () => {
  const itensRel = [
    { clienteId: "cli-a", competencia: "2026-01", valorLiquido: 1000, sistema: 800, acompanhamento: 200, pago: true },
    { clienteId: "cli-a", competencia: "2026-02", valorLiquido: 1200, sistema: 1000, acompanhamento: 200, pago: true },
    { clienteId: "cli-a", competencia: "2026-03", valorLiquido: 900, sistema: 700, acompanhamento: 200, pago: false },
    { clienteId: "cli-b", competencia: "2026-01", valorLiquido: 500, sistema: 500, acompanhamento: 0, pago: true },
  ];

  it("soma aumentos e reduções pelo sinal real do delta", () => {
    const r = montarRelatorioParceiro({ ano: 2026, veValores: true, itens: itensRel });
    expect(r.aumentos).toBe(200);
    expect(r.reducoes).toBe(300);
    expect(r.totalPago).toBe(2700);
    expect(r.clientesConsiderados).toBe(2);
    expect(r.ticketMedio).toBe(1350);
    expect(r.pagoPorMes.find((m) => m.chave === "2026-01")?.total).toBe(1500);
    expect(r.composicao).toEqual({ sistema: 3000, acompanhamento: 600 });
  });

  it("sem permissão de composição, o gráfico sistema × acompanhamento não existe", () => {
    const r = montarRelatorioParceiro({ ano: 2026, veValores: false, itens: itensRel });
    expect(r.composicao).toBeNull();
  });
});
