import { explicarReceitaCliente } from "@/lib/calc/receita";
import type { Cliente, Plano } from "@/lib/types";

export type PlanoCalculadoraParceiro = {
  id: string;
  nome: string;
  cobranca: "recorrente" | "unica";
  valorMensal: number;
  valorSetup: number;
  /** Acompanhamento padrão do plano — embutido na mensalidade base, sem discriminar. */
  valorAcompanhamento: number;
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
  /** Total de números WhatsApp que serão conectados. */
  canaisWhatsTotal: number;
  /** Quantos desses números são API Oficial (o restante vira Z-API). */
  canaisWhatsOficiais: number;
  canaisInsta: number;
  canaisMessenger: number;
  agentesIA: boolean;
  asaas: boolean;
  transcricaoIA: boolean;
};

export type MargemParceiro = {
  tipo: "fixa" | "percentual";
  valor: number;
  base: "mensalidade" | "mensalidade_setup";
};

/** Quantos números não oficiais viram Z-API. */
export function canaisZapiDerivados(config: ConfiguracaoCalculadoraParceiro) {
  return Math.max(0, config.canaisWhatsTotal - config.canaisWhatsOficiais);
}

/** Margem do parceiro aplicada sobre a base escolhida por ele. */
export function calcularMargemParceiro(
  margem: MargemParceiro,
  mensalidade: number,
  setup: number,
) {
  const base = margem.base === "mensalidade_setup" ? mensalidade + setup : mensalidade;
  const valor =
    margem.tipo === "percentual" ? (base * (margem.valor || 0)) / 100 : margem.valor || 0;
  return Math.max(0, valor);
}


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

  const canaisZapi = canaisZapiDerivados(config);

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
    canais: config.canaisWhatsTotal + config.canaisInsta + config.canaisMessenger,
    canaisWhats: config.canaisWhatsTotal,
    canaisInsta: config.canaisInsta,
    canaisMessenger: config.canaisMessenger,
    canaisZapi,
    usuariosAtivos: config.usuarios,
    contatosAtivos: config.contatos,
    agentesIA: config.agentesIA,
    asaas: config.asaas,
    zapi: canaisZapi > 0,
    transcricaoIA: config.transcricaoIA,
    valorSetupPago: plano.valorSetup,
    valorAcompanhamento: 0,
    extras: {},
  };


  return explicarReceitaCliente(cliente, [plano]);
}