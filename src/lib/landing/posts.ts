import capa1 from "@/assets/blog/capa-primeira-resposta.svg";
import capa2 from "@/assets/blog/capa-agentes-ia.svg";
import capa3 from "@/assets/blog/capa-funil-whatsapp.svg";
import capa4 from "@/assets/blog/capa-indicadores.svg";
import capa5 from "@/assets/blog/capa-custo-api-whatsapp.svg";

export type Bloco =
  | { tipo: "h2"; texto: string }
  | { tipo: "p"; texto: string }
  | { tipo: "lista"; itens: string[] }
  | { tipo: "citacao"; texto: string };

export type Post = {
  slug: string;
  titulo: string;
  resumo: string;
  categoria: string;
  autor: string;
  data: string; // ISO
  leitura: number; // minutos
  capa: string;
  corpo: Bloco[];
};

export const CATEGORIAS = ["Atendimento", "Vendas", "Inteligência Artificial", "Gestão"];

export const POSTS: Post[] = [
  {
    slug: "reduzir-custos-api-oficial-whatsapp",
    titulo: "Como reduzir custos na API Oficial do WhatsApp",
    resumo:
      "A cobrança passa a considerar também as mensagens enviadas pela sua empresa. Veja onde o custo nasce e como reduzir sem piorar o atendimento.",
    categoria: "Gestão",
    autor: "Equipe EloraCRM",
    data: "2026-09-10",
    leitura: 9,
    capa: capa5,
    corpo: [
      {
        tipo: "p",
        texto:
          "A mudança na precificação da API Oficial do WhatsApp torna a gestão das mensagens ainda mais importante. Cada mensagem enviada pela empresa precisa ter mais intenção, mais clareza e mais eficiência.",
      },
      { tipo: "citacao", texto: "Não é sobre responder menos. É sobre responder melhor." },
      { tipo: "h2", texto: "1. Entenda onde o custo nasce" },
      {
        tipo: "p",
        texto:
          "O custo não está apenas no número de clientes atendidos, e sim no volume de mensagens enviadas pela empresa. Uma empresa com 1.000 atendimentos e 5 mensagens por atendimento envia 5.000 mensagens: a R$ 0,04, são R$ 200,00 por mês. Outra, com os mesmos 1.000 atendimentos e 15 mensagens por atendimento, envia 15.000 mensagens e paga R$ 600,00. Mesmo volume de atendimentos, custo três vezes maior.",
      },
      { tipo: "h2", texto: "2. Reduza mensagens quebradas" },
      {
        tipo: "p",
        texto:
          "Perguntar “Olá”, “Tudo bem?”, “Me passa seu nome?”, “Agora o CPF?”, “Agora seu e-mail?”, “Qual produto?” são 6 mensagens — R$ 0,24 por atendimento. A mesma coisa em uma mensagem completa custa R$ 0,04. Em 5.000 atendimentos por mês, a diferença chega a R$ 1.000,00 de economia potencial.",
      },
      { tipo: "h2", texto: "3. Crie respostas rápidas mais inteligentes" },
      {
        tipo: "p",
        texto:
          "Respostas rápidas não são só textos prontos: elas padronizam o atendimento e evitam várias mensagens seguidas. Em vez de “Claro.”, “Temos sim.”, “O valor é R$ 299.”, “Quer o link?”, use uma única mensagem com preço e próximo passo.",
      },
      {
        tipo: "lista",
        itens: [
          "Primeiro atendimento",
          "Pedido de dados cadastrais",
          "Envio de preço e explicação de planos",
          "Confirmação de agendamento",
          "Suporte recorrente e encerramento",
          "Recuperação de venda e reativação",
        ],
      },
      { tipo: "h2", texto: "4. Revise o chatbot para ter menos etapas" },
      {
        tipo: "p",
        texto:
          "Um bot com 8 mensagens custa R$ 0,32 por atendimento — R$ 3.200,00 em 10.000 atendimentos. Agrupe perguntas, corte saudações desnecessárias, evite loops e transfira com contexto. Um bot bem configurado reduz custo porque resolve mais rápido.",
      },
      { tipo: "h2", texto: "5. Configure a IA para ser objetiva" },
      {
        tipo: "p",
        texto:
          "IA que responde em textos longos e picados pode chegar a 12 mensagens por atendimento (R$ 0,48). Ajustada para 5 mensagens, cai para R$ 0,20 — economia de R$ 1.400,00 por mês em 5.000 atendimentos.",
      },
      {
        tipo: "lista",
        itens: [
          "Responda com objetividade e sem dividir a resposta em várias mensagens",
          "No máximo uma pergunta por etapa",
          "Não repita informações já enviadas",
          "Transfira para humano quando não houver segurança",
          "Evite mensagens de preenchimento como “só um momento”",
        ],
      },
      { tipo: "h2", texto: "6. Transfira para o humano com contexto" },
      {
        tipo: "p",
        texto:
          "Transferência mal feita gera mensagens extras e irrita o cliente. Passe nome, motivo do contato, dados já coletados, etapa do funil e a próxima ação recomendada.",
      },
      { tipo: "h2", texto: "7. Campanhas: segmentação vale dinheiro" },
      {
        tipo: "p",
        texto:
          "Com referência de R$ 0,38 por mensagem de marketing, disparar para 20.000 contatos sem segmentação custa R$ 7.600,00. Com 5.000 contatos segmentados, R$ 1.900,00 — geralmente com retorno maior.",
      },
      { tipo: "h2", texto: "8. Metas por tipo de atendimento" },
      {
        tipo: "lista",
        itens: [
          "Primeiro atendimento comercial: de 10 para 6 mensagens",
          "Suporte simples: de 8 para 5",
          "Segunda via de boleto: de 6 para 3",
          "Agendamento: de 7 para 4",
          "Qualificação de lead: de 12 para 6",
          "Pós-venda: de 8 para 5",
        ],
      },
      { tipo: "h2", texto: "9. Plano de redução em 30 dias" },
      {
        tipo: "lista",
        itens: [
          "Semana 1 — diagnóstico: volume de atendimentos, mensagens enviadas e média por atendimento",
          "Semana 2 — ajustes rápidos: respostas rápidas, agrupamento de perguntas, encerramentos",
          "Semana 3 — bot e IA: menos etapas, prompts objetivos, regras de transferência",
          "Semana 4 — gestão: relatório mensal, metas por setor e treinamento do time",
        ],
      },
      { tipo: "h2", texto: "O que não fazer" },
      {
        tipo: "p",
        texto:
          "Não oriente o time a “responder menos” sem critério, não corte mensagens importantes de suporte, não elimine automações úteis e não pare campanhas sem analisar retorno. A mudança é uma oportunidade de melhorar a operação, não apenas um aumento de custo.",
      },
      {
        tipo: "citacao",
        texto: "Cada mensagem precisa ter uma função clara.",
      },
    ],
  },
  {
    slug: "reduzir-tempo-primeira-resposta-whatsapp",
    titulo: "Como reduzir o tempo de primeira resposta no WhatsApp",
    resumo:
      "O primeiro minuto define a venda. Veja como organizar filas, distribuição e respostas rápidas para atender antes do concorrente.",
    categoria: "Atendimento",
    autor: "Equipe EloraCRM",
    data: "2026-09-08",
    leitura: 6,
    capa: capa1,
    corpo: [
      {
        tipo: "p",
        texto:
          "Quando alguém manda mensagem para a sua empresa, a expectativa é de resposta imediata. Cada minuto de espera reduz a chance de fechar aquele atendimento — e o cliente simplesmente abre a conversa do concorrente que já estava respondendo.",
      },
      { tipo: "h2", texto: "Meça antes de mudar qualquer coisa" },
      {
        tipo: "p",
        texto:
          "Antes de criar processo novo, descubra qual é o seu tempo médio de primeira resposta hoje, separado por canal e por horário. É comum descobrir que o problema não é o time inteiro, e sim uma janela específica do dia.",
      },
      {
        tipo: "lista",
        itens: [
          "Tempo médio de primeira resposta por canal",
          "Conversas sem resposta em mais de 5 minutos",
          "Horários de pico versus atendentes disponíveis",
          "Percentual de conversas que viraram oportunidade",
        ],
      },
      { tipo: "h2", texto: "Distribua as conversas automaticamente" },
      {
        tipo: "p",
        texto:
          "Fila única com distribuição automática evita o clássico “achei que alguém já tinha respondido”. Cada conversa nova entra com dono definido, prazo visível e etiqueta de origem.",
      },
      {
        tipo: "citacao",
        texto:
          "Responder em até 1 minuto costuma multiplicar a taxa de conversão em comparação com respostas depois de 10 minutos.",
      },
      { tipo: "h2", texto: "Padronize as três primeiras mensagens" },
      {
        tipo: "p",
        texto:
          "Saudação, qualificação e próximo passo. Com respostas rápidas salvas, o atendente ganha segundos preciosos e o cliente percebe consistência, não improviso.",
      },
    ],
  },
  {
    slug: "agentes-de-ia-no-atendimento",
    titulo: "Agentes de IA no atendimento: o que automatizar (e o que não)",
    resumo:
      "IA bem aplicada tira o repetitivo do caminho e devolve tempo ao time. Mas existe uma linha clara entre ajudar e irritar o cliente.",
    categoria: "Inteligência Artificial",
    autor: "Equipe EloraCRM",
    data: "2026-09-02",
    leitura: 7,
    capa: capa2,
    corpo: [
      {
        tipo: "p",
        texto:
          "Agente de IA não é substituto de time comercial. É filtro, é triagem e é memória. Quando o papel dele está bem definido, o atendimento humano fica mais rápido e mais caro de imitar.",
      },
      { tipo: "h2", texto: "Automatize o que é previsível" },
      {
        tipo: "lista",
        itens: [
          "Perguntas repetidas: horário, endereço, formas de pagamento",
          "Qualificação inicial e coleta de dados básicos",
          "Agendamento e confirmação de compromissos",
          "Follow-up de conversas paradas",
        ],
      },
      { tipo: "h2", texto: "Mantenha humano o que é decisão" },
      {
        tipo: "p",
        texto:
          "Negociação, reclamação séria e qualquer conversa com carga emocional precisam de gente. A regra de transferência deve ser explícita: se o cliente pedir, se houver insatisfação ou se o assunto sair do escopo, o agente passa a bola na hora.",
      },
      {
        tipo: "citacao",
        texto: "O melhor agente de IA é aquele que sabe exatamente quando parar de falar.",
      },
      { tipo: "h2", texto: "Revise as conversas toda semana" },
      {
        tipo: "p",
        texto:
          "Leia amostras reais, ajuste instruções e corte respostas genéricas. IA de atendimento é produto vivo: melhora com manutenção, não com configuração única.",
      },
    ],
  },
  {
    slug: "funil-de-vendas-no-whatsapp",
    titulo: "Funil de vendas no WhatsApp: da conversa ao fechamento",
    resumo:
      "Conversa sem etapa vira bagunça. Monte um funil simples e visual para saber exatamente onde cada negociação parou.",
    categoria: "Vendas",
    autor: "Equipe EloraCRM",
    data: "2026-08-26",
    leitura: 5,
    capa: capa3,
    corpo: [
      {
        tipo: "p",
        texto:
          "A maior perda de receita no WhatsApp não é o “não” do cliente: é a conversa que ficou sem resposta e ninguém lembrou de retomar.",
      },
      { tipo: "h2", texto: "Comece com poucas etapas" },
      {
        tipo: "lista",
        itens: [
          "Novo contato",
          "Em qualificação",
          "Proposta enviada",
          "Negociação",
          "Fechado / Perdido",
        ],
      },
      {
        tipo: "p",
        texto:
          "Funil com quinze etapas ninguém atualiza. Cinco etapas, com critério claro de passagem, o time mantém em dia.",
      },
      { tipo: "h2", texto: "Todo card precisa de próximo passo" },
      {
        tipo: "p",
        texto:
          "Sem data e sem responsável, o card é só um lembrete bonito. Com follow-up agendado, o funil trabalha por você.",
      },
      {
        tipo: "citacao",
        texto: "Funil não é relatório para o gestor. É lista de tarefas para o vendedor.",
      },
    ],
  },
  {
    slug: "indicadores-para-gestor-de-atendimento",
    titulo: "5 indicadores que todo gestor de atendimento deveria acompanhar",
    resumo:
      "Volume de mensagens não diz nada sozinho. Estes cinco números mostram se a operação está saudável de verdade.",
    categoria: "Gestão",
    autor: "Equipe EloraCRM",
    data: "2026-08-19",
    leitura: 6,
    capa: capa4,
    corpo: [
      {
        tipo: "p",
        texto:
          "Painel cheio de gráfico não melhora resultado. Poucos indicadores, olhados toda semana, mudam o comportamento do time.",
      },
      { tipo: "h2", texto: "Os cinco que importam" },
      {
        tipo: "lista",
        itens: [
          "Tempo de primeira resposta",
          "Tempo total de resolução",
          "Conversas por atendente",
          "Taxa de conversão por origem",
          "Satisfação ao final do atendimento",
        ],
      },
      { tipo: "h2", texto: "Compare períodos, não pessoas" },
      {
        tipo: "p",
        texto:
          "Indicador serve para encontrar gargalo de processo. Quando vira ranking pessoal, o time aprende a maquiar número em vez de resolver problema.",
      },
      {
        tipo: "citacao",
        texto: "Meça pouco, com frequência, e aja em cima do que mediu.",
      },
      { tipo: "h2", texto: "Feche a semana com uma ação" },
      {
        tipo: "p",
        texto:
          "Toda reunião de indicadores deveria terminar com uma mudança concreta: uma regra de distribuição, uma resposta rápida nova, um horário reforçado.",
      },
    ],
  },
];

export function getPost(slug: string) {
  return POSTS.find((p) => p.slug === slug);
}

export function formatarData(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
