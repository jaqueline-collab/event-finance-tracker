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
  {
    q: "O que mudou na cobrança da API Oficial do WhatsApp?",
    a: "A Meta anunciou que as respostas enviadas pela empresa ao cliente também passam a entrar na lógica de cobrança por mensagem entregue. Exemplo: o cliente chama, o atendente envia 10 respostas e, a R$ 0,04 por resposta, o atendimento custa R$ 0,40.",
  },
  {
    q: "A nova cobrança é por conversa ou por mensagem?",
    a: "A lógica passa a ser por mensagem entregue. Conversas iniciadas por modelo de mensagem (marketing ou utilidade) continuam sendo cobradas como antes. Ou seja: 1 atendimento com 3 respostas = 3 mensagens cobradas; com 15 respostas = 15 mensagens.",
  },
  {
    q: "As mensagens recebidas dos clientes serão cobradas?",
    a: "Não. O foco da cobrança está nas mensagens entregues pela empresa ao cliente — seja por atendente, bot, automação ou IA. A mensagem que o cliente envia não é o ponto de cobrança.",
  },
  {
    q: "Quanto vai custar cada mensagem?",
    a: "Referências usadas nas simulações: marketing R$ 0,38 por mensagem entregue; utilidade e autenticação R$ 0,04; atendimento/serviço simulado em R$ 0,04. Os valores devem ser confirmados conforme a tabela oficial e o consumo real.",
  },
  {
    q: "Bot e IA também podem gerar custo?",
    a: "Sim. Se o bot, a automação ou a IA envia mensagens ao cliente, elas entram no volume enviado pela empresa. Um chatbot com 8 mensagens custa R$ 0,32 por atendimento — em 5.000 atendimentos, R$ 1.600,00 por mês.",
  },
  {
    q: "Isso significa que bot e IA ficaram ruins?",
    a: "Não. Eles continuam essenciais para reduzir retrabalho, qualificar leads e acelerar respostas. O que muda é que precisam ser bem configurados: um bot enxuto resolve mais rápido e reduz o custo da operação.",
  },
  {
    q: "Como reduzir o impacto da mudança de cobrança?",
    a: "Evite mensagens quebradas. Em vez de enviar “Olá”, “Tudo bem?”, “Me passa seu nome?”, “Agora seu CPF?” (6 mensagens, R$ 0,24), envie uma mensagem completa pedindo todos os dados de uma vez (1 mensagem, R$ 0,04). Em escala, a diferença é grande.",
  },
  {
    q: "Qual tipo de operação será mais impactada?",
    a: "Operações com alto volume de atendimento, muitos atendentes, muitas mensagens curtas, chatbots longos, IA sem configuração objetiva, campanhas que geram leads desqualificados, baixa padronização de respostas e muitas transferências entre setores.",
  },
  {
    q: "Campanhas de marketing também entram nessa cobrança?",
    a: "Sim, e já seguem uma categoria própria, normalmente com custo maior. Por isso as campanhas precisam ser bem segmentadas, evitando bases frias, desatualizadas ou com baixa intenção de compra.",
  },
  {
    q: "Devo parar de fazer campanhas pelo WhatsApp?",
    a: "Não necessariamente — o ideal é melhorar a estratégia. Campanhas com público certo e oferta clara tendem a gerar retorno. O problema é disparar sem critério para contatos desqualificados.",
  },
  {
    q: "A API Oficial ainda vale a pena?",
    a: "Sim. Continua sendo o caminho mais seguro e profissional para quem precisa de múltiplos atendentes, histórico centralizado, relatórios, automação, IA, integrações, campanhas, escala e segurança. O que muda é a necessidade de gerenciar melhor a operação.",
  },
  {
    q: "O que devemos fazer agora?",
    a: "Revisar a operação antes do impacto: quantos atendimentos por mês, quantas mensagens por atendimento, quais fluxos de bot existem, como a IA responde, quais campanhas estão ativas e onde dá para consolidar respostas. A meta não é responder menos, é responder melhor.",
  },
];
