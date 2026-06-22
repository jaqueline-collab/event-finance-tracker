// Tabela de preços de vitrine — ajuste os placeholders quando definir a tabela final.

export type PlanoVitrineKey = "essencial" | "escala" | "corporativo";

export interface PlanoVitrine {
  key: PlanoVitrineKey;
  nome: string;
  mensal: number;
  usuariosInclusos: number;
  whatsInclusos: number;
  instaInclusos: number;
  messengerInclusos: number;
  destaque?: boolean;
  recursos: string[];
}

export const PLANOS_VITRINE: PlanoVitrine[] = [
  {
    key: "essencial",
    nome: "Essencial",
    mensal: 349.99,
    usuariosInclusos: 3,
    whatsInclusos: 1,
    instaInclusos: 0,
    messengerInclusos: 1,
    recursos: [
      "3 usuários inclusos",
      "1 canal WhatsApp + Messenger",
      "CRM e Kanban",
      "Chatbot de Atendimento",
      "Chatbot de Automação",
      "Disparo de Mensagens",
      "APP Mobile",
    ],
  },
  {
    key: "escala",
    nome: "Escala",
    mensal: 599.99,
    usuariosInclusos: 5,
    whatsInclusos: 1,
    instaInclusos: 1,
    messengerInclusos: 1,
    destaque: true,
    recursos: [
      "5 usuários inclusos",
      "WhatsApp + Instagram + Messenger",
      "Tudo do Essencial",
      "Integração Webhooks + API",
      "Suporte prioritário",
    ],
  },
  {
    key: "corporativo",
    nome: "Corporativo",
    mensal: 899.99,
    usuariosInclusos: 10,
    whatsInclusos: 1,
    instaInclusos: 1,
    messengerInclusos: 1,
    recursos: [
      "10 usuários inclusos",
      "WhatsApp + Instagram + Messenger",
      "Tudo do Escala",
      "Onboarding assistido",
      "Account manager",
    ],
  },
];

export const ADICIONAIS_VITRINE = {
  usuarioExtra: 29.99,
  whatsOficial: 49.99,
  whatsNaoOficial: 49.99,
  zapi: 79.99,
  instagram: 49.99,
  messenger: 49.99,
  moduloIA: 199.99,
  asaas: 99.99,
  transcricao: 6.99,
  tempoSeguranca: 0.99,
  mensagensAgendadas: 9.99,
};

export type AdicionaisKey = keyof typeof ADICIONAIS_VITRINE;

export function planoVitrine(key: PlanoVitrineKey): PlanoVitrine {
  return PLANOS_VITRINE.find((p) => p.key === key)!;
}