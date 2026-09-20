import { describe, expect, it } from "vitest";
import {
  calcularMargemParceiro,
  calcularOrcamentoParceiro,
  canaisZapiDerivados,
  type PlanoCalculadoraParceiro,
} from "@/lib/parceiro.calculadora";


const plano: PlanoCalculadoraParceiro = {
  id: "rabbit",
  nome: "Essencial Rabbit Agency",
  cobranca: "recorrente",
  valorMensal: 199.99,
  valorSetup: 0,
  canaisWhatsInclusos: 1,
  canaisInstaInclusos: 0,
  canaisMessengerInclusos: 1,
  usuariosInclusos: 3,
  contatosInclusos: 5000,
  incluiIA: false,
  incluiAsaas: false,
  incluiZapi: 0,
  incluiTranscricao: false,
  valorCanalWhatsExc: 59.9,
  valorCanalInstaExc: 59.9,
  valorCanalMessengerExc: 0,
  valorUsuariosExc: 29.99,
  valorContatosExc: 0.095,
  valorIA: 99,
  valorAsaas: 89,
  valorZapi: 149,
  valorTranscricaoUser: 7.99,
};

describe("Calculadora do parceiro", () => {
  it("reutiliza a composição oficial e calcula somente excedentes comerciais", () => {
    const resultado = calcularOrcamentoParceiro(plano, {
      usuarios: 5,
      contatos: 5000,
      canaisWhatsTotal: 1,
      canaisWhatsOficiais: 1,
      canaisInsta: 0,
      canaisMessenger: 1,
      agentesIA: false,
      asaas: false,
      transcricaoIA: false,
    });
    expect(resultado.itens.map((i) => i.label)).toEqual([
      "Licença base · Essencial Rabbit Agency",
      "Usuários excedentes",
    ]);
    expect(resultado.acompanhamento).toBe(0);
    expect(resultado.total).toBeCloseTo(259.97, 2);
  });

  it("cobra Z-API só sobre os números que não são API Oficial", () => {
    const config = {
      usuarios: 3,
      contatos: 5000,
      canaisWhatsTotal: 3,
      canaisWhatsOficiais: 1,
      canaisInsta: 0,
      canaisMessenger: 1,
      agentesIA: false,
      asaas: false,
      transcricaoIA: false,
    };
    expect(canaisZapiDerivados(config)).toBe(2);
    const resultado = calcularOrcamentoParceiro(plano, config);
    const linhaZapi = resultado.itens.find((i) => i.label.toLowerCase().includes("z-api"));
    expect(linhaZapi?.qtd).toBe(2);
    expect(linhaZapi?.total).toBeCloseTo(298, 2);
  });

  it("aplica margem fixa e percentual nas duas bases", () => {
    expect(calcularMargemParceiro({ tipo: "fixa", valor: 100, base: "mensalidade" }, 500, 200)).toBe(100);
    expect(
      calcularMargemParceiro({ tipo: "percentual", valor: 10, base: "mensalidade" }, 500, 200),
    ).toBeCloseTo(50, 2);
    expect(
      calcularMargemParceiro({ tipo: "percentual", valor: 10, base: "mensalidade_setup" }, 500, 200),
    ).toBeCloseTo(70, 2);
  });

  it("o contrato público não contém campos de custo, margem, lucro ou WTS", () => {
    const payload = JSON.stringify(plano).toLowerCase();
    for (const chave of ["custo", "lucro", "wts", "licencabase", "precousuarios"]) {
      expect(payload).not.toContain(chave);
    }
  });
});
