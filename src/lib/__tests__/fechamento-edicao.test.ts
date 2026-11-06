import { describe, expect, it } from "vitest";
import { aplicarEdicao, exigirAdmin, salvarEdicaoSchema, ConfirmacaoNecessaria } from "../fechamento-edicao.aplicar";
import { composicaoInicial, recalcularItem } from "../fechamento-edicao";
import { compararFechamentos, composicaoDe, montarFechamentosParceiro } from "../parceiro.financeiro";

// Banco em memória com o pedaço da API do supabase-js que a edição usa.
function fakeDb(tabelas: Record<string, any[]>) {
  const from = (t: string) => {
    tabelas[t] ??= [];
    const filtros: ((r: any) => boolean)[] = [];
    let modo: "select" | "update" = "select";
    let patch: any = null;
    const q: any = {
      select: () => q,
      eq: (c: string, v: any) => { filtros.push((r) => r[c] === v); return q; },
      is: (c: string, v: any) => { filtros.push((r) => (r[c] ?? null) === v); return q; },
      in: (c: string, v: any[]) => { filtros.push((r) => v.includes(r[c])); return q; },
      order: () => q, limit: () => q,
      update: (p: any) => { modo = "update"; patch = p; return q; },
      insert: (rows: any) => { tabelas[t].push(...(Array.isArray(rows) ? rows : [rows]).map((r) => ({ ...r }))); return Promise.resolve({ error: null }); },
      maybeSingle: () => Promise.resolve({ data: tabelas[t].find((r) => filtros.every((f) => f(r))) ?? null, error: null }),
      then: (ok: any, ko: any) => {
        const alvo = tabelas[t].filter((r) => filtros.every((f) => f(r)));
        if (modo === "update") alvo.forEach((r) => Object.assign(r, patch));
        return Promise.resolve({ data: alvo, error: null }).then(ok, ko);
      },
    };
    return q;
  };
  return { from, tabelas };
}

const FID = "11111111-1111-4111-8111-111111111111";
const IA = "22222222-2222-4222-8222-222222222222";
const IB = "33333333-3333-4333-8333-333333333333";
const IC = "44444444-4444-4444-8444-444444444444";

function cenario(enviado = false, nf = false) {
  return fakeDb({
    elora_fechamentos: [{ id: FID, titulo: "Out/2026", descricao: null, observacao: null, competencia: "2026-10", total_bruto: 1100, total_desconto: 0, total_liquido: 1100, enviado_parceiro_em: enviado ? "2026-11-01" : null, deletado_em: null }],
    elora_fechamento_itens: [
      { id: IA, fechamento_id: FID, cliente_id: "a", plano_id: "p", ciclo_inicio: "2026-09-01", ciclo_fim: "2026-09-30", vencimento: "2026-10-10", valor_bruto: 500, valor_desconto: 0, valor_liquido: 500, lancamento_financeiro_id: "LA", payload_snapshot: { sistema: 250, acompanhamento: 250, planoNome: "Essencial", composicao: { u: 3 } } },
      { id: IB, fechamento_id: FID, cliente_id: "b", plano_id: "p", ciclo_inicio: null, ciclo_fim: null, vencimento: "2026-10-10", valor_bruto: 600, valor_desconto: 0, valor_liquido: 600, lancamento_financeiro_id: "LB", payload_snapshot: { sistema: 600, planoNome: "Essencial" } },
    ],
    elora_financeiro: [
      { id: "LA", valor: 500, vencimento: "2026-10-10", status: "pendente", nf_emitida: nf, nf_numero: nf ? "123" : null },
      { id: "LB", valor: 600, vencimento: "2026-10-10", status: "pendente", nf_emitida: false, nf_numero: null },
    ],
    elora_fechamento_edicoes: [],
  });
}

const itemDe = (row: any, extra: any = {}) => ({
  id: row.id, clienteId: row.cliente_id, planoId: row.plano_id, planoNome: "Essencial", clienteNome: row.cliente_id.toUpperCase(),
  cicloInicio: row.ciclo_inicio, cicloFim: row.ciclo_fim, vencimento: row.vencimento, valorDesconto: Number(row.valor_desconto),
  composicao: composicaoInicial(row.payload_snapshot, null, Number(row.valor_bruto)),
  lancamentoFinanceiroId: row.lancamento_financeiro_id, lancamento: null, ...extra,
});

const entrada = (db: any, itens: any[], extra: any = {}) => salvarEdicaoSchema.parse({
  fechamentoId: FID, motivo: "teste", cabecalho: { titulo: "Out/2026", descricao: null, observacao: null, competencia: "2026-10" }, itens, ...extra,
});

describe("edição de fechamento", () => {
  it("isentar o acompanhamento zera o cobrado, guarda o original e recalcula tudo", async () => {
    const db = cenario();
    const [a, b] = db.tabelas.elora_fechamento_itens;
    const ia = itemDe(a); ia.composicao.acompanhamentoIsento = true;
    const r = await aplicarEdicao(db, "u1", entrada(db, [ia, itemDe(b)]));
    expect(r.totalLiquido).toBe(850);
    const novoA = db.tabelas.elora_fechamento_itens.find((x) => x.id === IA);
    expect(novoA.valor_bruto).toBe(250);
    expect(novoA.valor_liquido).toBe(250);
    expect(novoA.payload_snapshot.acompanhamento).toBe(0);
    expect(novoA.payload_snapshot.acompanhamentoOriginal).toBe(250);
    expect(composicaoDe(novoA.payload_snapshot).map((l) => l.label)).toContain("Acompanhamento (isento)");
    expect(db.tabelas.elora_fechamentos[0].total_liquido).toBe(850);
    expect(db.tabelas.elora_financeiro.find((l) => l.id === "LA").valor).toBe(250);
    expect(db.tabelas.elora_fechamentos[0].editado_em).toBeTruthy();
  });

  it("registra no histórico o valor antigo e o novo", async () => {
    const db = cenario();
    const [a, b] = db.tabelas.elora_fechamento_itens;
    await aplicarEdicao(db, "u1", entrada(db, [itemDe(a, { valorDesconto: 50 }), itemDe(b)]));
    const h = db.tabelas.elora_fechamento_edicoes.find((e) => e.item_id === IA && e.campo === "valor_desconto");
    expect(h).toMatchObject({ valor_antigo: 0, valor_novo: 50, motivo: "teste", editado_por: "u1" });
    const t = db.tabelas.elora_fechamento_edicoes.find((e) => e.campo === "total_liquido");
    expect(t).toMatchObject({ valor_antigo: 1100, valor_novo: 1050 });
  });

  it("incluir um cliente cria item e lançamento; remover guarda o item e cancela o lançamento", async () => {
    const db = cenario();
    const [a, b] = db.tabelas.elora_fechamento_itens;
    const novo = {
      id: IC, clienteId: "c", planoId: "p", planoNome: "Essencial", clienteNome: "C", cicloInicio: null, cicloFim: null,
      vencimento: "2026-10-15", valorDesconto: 0, novo: true, lancamentoFinanceiroId: null,
      lancamento: { status: "pendente", nfEmitida: false, nfNumero: null },
      composicao: { linhas: [{ label: "Sistema", qtd: 1, unit: 300, total: 300 }], acompanhamentoOriginal: 0, acompanhamentoIsento: false, mauExcedenteValor: 0 },
    };
    const r = await aplicarEdicao(db, "u1", entrada(db, [itemDe(a), itemDe(b, { removido: true }), novo]));
    expect(r.totalLiquido).toBe(800);
    const rb = db.tabelas.elora_fechamento_itens.find((x) => x.id === IB);
    expect(rb.removido_em).toBeTruthy();
    expect(rb.valor_liquido).toBe(600); // preservado
    expect(db.tabelas.elora_financeiro.find((l) => l.id === "LB").status).toBe("cancelado");
    const rc = db.tabelas.elora_fechamento_itens.find((x) => x.id === IC);
    expect(rc.valor_liquido).toBe(300);
    expect(db.tabelas.elora_financeiro.find((l) => l.id === rc.lancamento_financeiro_id).valor).toBe(300);
    expect(db.tabelas.elora_fechamento_edicoes.some((e) => e.campo === "item.removido" && e.valor_antigo.valor_liquido === 600)).toBe(true);
  });

  it("fechamento liberado ao parceiro exige confirmação e nada é gravado sem ela", async () => {
    const db = cenario(true);
    const [a, b] = db.tabelas.elora_fechamento_itens;
    await expect(aplicarEdicao(db, "u1", entrada(db, [itemDe(a, { valorDesconto: 10 }), itemDe(b)]))).rejects.toBeInstanceOf(ConfirmacaoNecessaria);
    expect(db.tabelas.elora_fechamento_itens[0].valor_desconto).toBe(0);
    expect(db.tabelas.elora_fechamento_edicoes).toHaveLength(0);
    await aplicarEdicao(db, "u1", entrada(db, [itemDe(a, { valorDesconto: 10 }), itemDe(b)], { confirmouParceiro: true }));
    expect(db.tabelas.elora_fechamento_itens[0].valor_liquido).toBe(490);
  });

  it("lançamento com NF emitida exige confirmação quando o valor muda", async () => {
    const db = cenario(false, true);
    const [a, b] = db.tabelas.elora_fechamento_itens;
    await expect(aplicarEdicao(db, "u1", entrada(db, [itemDe(a, { valorDesconto: 10 }), itemDe(b)]))).rejects.toThrow(/confirmacao-nf/);
  });

  it("recusa item de outro fechamento", async () => {
    const db = cenario();
    const [a, b] = db.tabelas.elora_fechamento_itens;
    const intruso = { ...itemDe(a), id: "55555555-5555-4555-8555-555555555555" };
    await expect(aplicarEdicao(db, "u1", entrada(db, [itemDe(a), itemDe(b), intruso]))).rejects.toThrow(/não pertence/);
  });

  it("não autorizado é recusado no servidor", async () => {
    await expect(exigirAdmin({ rpc: async () => ({ data: false, error: null }) })).rejects.toThrow(/Sem permissão/);
    await expect(exigirAdmin({ rpc: async () => ({ data: true, error: null }) })).resolves.toBeUndefined();
  });

  it("visão do parceiro, PDF e comparação usam os valores editados e ignoram item removido", async () => {
    const db = cenario(true);
    const [a, b] = db.tabelas.elora_fechamento_itens;
    const ia = itemDe(a); ia.composicao.acompanhamentoIsento = true;
    await aplicarEdicao(db, "u1", entrada(db, [ia, itemDe(b, { removido: true })], { confirmouParceiro: true }));
    const nomes = new Map([["a", "A"], ["b", "B"]]);
    const cab = db.tabelas.elora_fechamentos.map((f) => ({ ...f, competencia: f.competencia }));
    const [depois] = montarFechamentosParceiro({ nomePorCliente: nomes, cabecalhos: cab, itens: db.tabelas.elora_fechamento_itens });
    expect(depois.linhas.map((l) => l.clienteId)).toEqual(["a"]);
    expect(depois.totalLiquido).toBe(250);
    expect(depois.linhas[0].composicao.map((l) => l.label)).toEqual(["Sistema", "Acompanhamento (isento)"]);

    const antes = montarFechamentosParceiro({ nomePorCliente: nomes, cabecalhos: cenario(true).tabelas.elora_fechamentos, itens: cenario(true).tabelas.elora_fechamento_itens })[0];
    const cmp = compararFechamentos(antes, depois);
    const s = Object.fromEntries(cmp.linhas.map((l) => [l.clienteId, l.situacao]));
    expect(s).toEqual({ a: "reduziu", b: "saiu" });
    expect(cmp.diferenca).toBe(-850);
  });

  it("composição inicial preserva o bruto gravado com linha de ajuste", () => {
    const c = composicaoInicial({ sistema: 100, acompanhamento: 50 }, null, 180);
    expect(recalcularItem(c, 0).valorBruto).toBe(180);
  });
});
