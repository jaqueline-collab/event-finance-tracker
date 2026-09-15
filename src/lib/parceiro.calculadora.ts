import { explicarReceitaCliente } from "@/lib/calc/receita";
import type { Cliente, Plano } from "@/lib/types";

export type PlanoCalculadoraParceiro = {
  id: string;
  nome: string;
  cobranca: "recorrente" | "unica";
  valorMensal: number;
  valorSetup: number;
  canaisWhatsInclusos: number;
  canaisInstaInclusos: number;
  canaisMessengerInclusos: number;
  usuariosInclusos: number;
  contatosInclusos: number;
  incluiIA: boolean;
  incluiAsaas: boolean;
  incluiZapi: number;
  incluiTranscricao: boolean;
  valorCanalWhatsExc: number;
  valorCanalInstaExc: number;
  valorCanalMessengerExc: number;
  valorUsuariosExc: number;
  valorContatosExc: number;
  valorIA: number;
  valorAsaas: number;
  valorZapi: number;
  valorTranscricaoUser: number;
};

export type ConfiguracaoCalculadoraParceiro = {
  usuarios: number;
  contatos: number;
  canaisWhats: number;
  canaisInsta: number;
  canaisMessenger: number;
  canaisZapi: number;
  agentesIA: boolean;
  asaas: boolean;
  transcricaoIA: boolean;
  acompanhamento: number;
};

/** Usa a mesma regra comercial dos clientes, sem carregar campos de custo. */
export function calcularOrcamentoParceiro(
  planoPublico: PlanoCalculadoraParceiro,
  config: ConfiguracaoCalculadoraParceiro,
) {
  const plano: Plano = {
    ...planoPublico,
    categoria: "elora",
    duracaoValor: null,
    duracaoUnidade: null,
    diaVencimento: null,
    cicloDiaInicial: 1,
    cicloDiaFinal: 31,
    cobrancaProporcional: false,
    canaisInclusos:
      planoPublico.canaisWhatsInclusos +
      planoPublico.canaisInstaInclusos +
      planoPublico.canaisMessengerInclusos,
    licencaBase: 0,
    precoCanaisExc: 0,
    precoUsuariosExc: 0,
    precoContatosExc: 0,
    precoIA: 0,
    precoAsaas: 0,
    precoZapi: 0,
    precoTranscricaoUser: 0,
    precoCanalWhatsExc: 0,
    precoCanalInstaExc: 0,
    precoCanalMessengerExc: 0,
    valorCanaisExc: planoPublico.valorCanalWhatsExc,
    parceiroIds: [],
  };

  const cliente: Cliente = {
    id: "simulacao",
    nome: "Simulação",
    planoId: plano.id,
    dataInicio: new Date().toISOString().slice(0, 10),
    dataVencimento: null,
    dataChurn: null,
    statusComercial: "ativo",
    apps: 0,
    mau: 0,
    canais: config.canaisWhats + config.canaisInsta + config.canaisMessenger,
    canaisWhats: config.canaisWhats,
    canaisInsta: config.canaisInsta,
    canaisMessenger: config.canaisMessenger,
    canaisZapi: config.canaisZapi,
    usuariosAtivos: config.usuarios,
    contatosAtivos: config.contatos,
    agentesIA: config.agentesIA,
    asaas: config.asaas,
    zapi: config.canaisZapi > 0,
    transcricaoIA: config.transcricaoIA,
    valorSetupPago: plano.valorSetup,
    valorAcompanhamento: config.acompanhamento,
    extras: {},
  };

  return explicarReceitaCliente(cliente, [plano]);
}