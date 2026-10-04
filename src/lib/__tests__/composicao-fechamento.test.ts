import { describe, expect, it } from "vitest";
import { composicaoDoFechamento } from "../calc/composicao-fechamento";
import type { Cliente, FechamentoItem, Plano } from "../types";

const plano = {
  id: "p1", nome: "Plano Teste", valorMensal: 200, canaisWhatsInclusos: 1,
  canaisInstaInclusos: 0, canaisMessengerInclusos: 0, usuariosInclusos: 3, contatosInclusos: 1000,
  valorCanalWhatsExc: 30, valorUsuariosExc: 30, incluiIA: false, incluiAsaas: false, incluiZapi: 0,
  incluiTranscricao: false,
} as unknown as Plano;

const cliente = {
  id: "c1", nome: "Cliente", planoId: "p1", dataInicio: "2026-01-01", dataChurn: null,
  canaisWhats: 2, canaisInsta: 0, canaisMessenger: 0, canaisZapi: 0, usuariosAtivos: 3,
  contatosAtivos: 0, agentesIA: false, asaas: false, transcricaoIA: false, valorAcompanhamento: 200,
} as unknown as Cliente;

const item = (snap: Record<string, unknown>): FechamentoItem => ({
  id: "i1", fechamentoId: "f1", clienteId: "c1", planoId: "p1", cicloFim: "2026-08-31",
  valorBruto: 480, valorDesconto: 0, valorLiquido: 480, payloadSnapshot: snap,
});

describe("composicaoDoFechamento", () => {
  it("usa a composição gravada quando existe", () => {
    const r = composicaoDoFechamento(
      item({ sistema: 230, acompanhamento: 250, composicao: { itens: [{ label: "X", qtd: 1, unit: 230, total: 230 }], subtotalSistema: 230, acompanhamento: 250 } }),
      cliente, [plano], [],
    );
    expect(r.fonte).toBe("gravada");
    expect(r.acompanhamento).toBe(250);
    expect(r.total).toBe(480);
  });

  it("reconstrói quando o sistema bate, usando o acompanhamento gravado", () => {
    const r = composicaoDoFechamento(item({ sistema: 230, acompanhamento: 250 }), cliente, [plano], []);
    expect(r.fonte).toBe("reconstruida");
    expect(r.acompanhamento).toBe(250);
    expect(r.subtotalSistema).toBeCloseTo(230);
    expect(r.total).toBe(480);
  });

  it("cai para só totais quando a reconstrução não bate", () => {
    const r = composicaoDoFechamento(item({ sistema: 999, acompanhamento: 250 }), cliente, [plano], []);
    expect(r.fonte).toBe("so_totais");
    expect(r.itens).toEqual([]);
    expect(r.subtotalSistema).toBe(999);
    expect(r.aviso).toBeTruthy();
    expect(r.total).toBe(480);
  });
});
