import { describe, expect, it } from "vitest";
import { calcularOrcamentoParceiro, type PlanoCalculadoraParceiro } from "@/lib/parceiro.calculadora";

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
      canaisWhats: 1,
      canaisInsta: 0,
      canaisMessenger: 1,
      canaisZapi: 0,
      agentesIA: false,
      asaas: false,
      transcricaoIA: false,
      acompanhamento: 250,
    });
    expect(resultado.itens.map((i) => i.label)).toEqual([
      "Licença base · Essencial Rabbit Agency",
      "Usuários excedentes",
    ]);
    expect(resultado.total).toBeCloseTo(509.97, 2);
  });

  it("o contrato público não contém campos de custo, margem, lucro ou WTS", () => {
    const payload = JSON.stringify(plano).toLowerCase();
    for (const chave of ["custo", "margem", "lucro", "wts", "licencabase", "precousuarios"]) {
      expect(payload).not.toContain(chave);
    }
  });
});