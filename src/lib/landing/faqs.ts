export type FaqItem = { q: string; a: string };

export const FAQS: FaqItem[] = [
  {
    q: "Qual a diferença entre WhatsApp Oficial e Não-Oficial?",
    a: "WhatsApp Oficial usa a API da Meta — mais estável, com selo verde e suporte a templates pagos. O Não-Oficial usa integração via Z-API, mais barato e com menos restrições de envio.",
  },
  {
    q: "Quanto tempo leva a implantação?",
    a: "Em média, de 5 a 10 dias úteis, dependendo da maturidade da operação e das integrações necessárias.",
  },
  {
    q: "Vocês integram com meu sistema atual?",
    a: "Sim. Suportamos integrações via webhooks e API, incluindo CRMs, ERPs e plataformas de pagamento como ASAAS.",
  },
  {
    q: "Como funciona o suporte?",
    a: "Todos os planos têm suporte por chat. Escala e Corporativo recebem suporte prioritário e SLA dedicado.",
  },
  {
    q: "Posso trocar de plano depois?",
    a: "Sim, a qualquer momento — para cima ou para baixo. Cobramos proporcionalmente no próximo ciclo.",
  },
  {
    q: "E se eu quiser cancelar?",
    a: "Sem fidelidade. Você pode cancelar quando quiser, mantendo acesso até o fim do ciclo já pago.",
  },
  {
    q: "Preciso trocar meu número de WhatsApp?",
    a: "Não. Conectamos o número que você já usa hoje, mantendo o histórico da operação e a identidade do seu negócio.",
  },
  {
    q: "Quantos atendentes posso ter?",
    a: "Quantos precisar. A cobrança é por usuário ativo, e você adiciona ou remove atendentes a qualquer momento.",
  },
  {
    q: "Os agentes de IA substituem meu time?",
    a: "Não — eles cuidam da triagem, das respostas repetitivas e do follow-up, e transferem para uma pessoa sempre que o atendimento exige.",
  },
  {
    q: "Meus dados ficam seguros?",
    a: "Sim. Cada conta tem acesso isolado, com permissões por perfil e registro das ações realizadas na plataforma.",
  },
];
