import type { Post } from "./posts";
import capa from "@/assets/blog/capa-webchat.svg";
import capaPng from "@/assets/blog/capa-webchat.png.asset.json";

export const SLUG_WEBCHAT = "webchat-elora-crm-guia-completo";

export const POST_WEBCHAT: Post = {
  slug: SLUG_WEBCHAT,
  titulo:
    "WebChat no Elora CRM: o guia completo do novo canal (e quanto ele economiza em relação à API Oficial)",
  subtitulo:
    "Atenda seus clientes por link ou QR Code, sem aplicativo, sem número de WhatsApp e sem tarifa da Meta por mensagem.",
  resumo:
    "Veja como criar o WebChat, como seu cliente usa e quanto você economiza em relação à API Oficial do WhatsApp com as novas cobranças da Meta.",
  seoTitulo: "WebChat no Elora CRM: guia completo e custos x API Oficial do WhatsApp",
  seoDescricao:
    "Veja como criar o WebChat no Elora CRM, como seu cliente usa, e quanto você economiza em relação à API Oficial do WhatsApp com as novas cobranças da Meta de outubro de 2026.",
  categoria: "Novidades",
  grupo: "Novidades",
  destaque: true,
  autor: "Equipe Elora CRM",
  data: "2026-09-10",
  leitura: 0,
  capa,
  ogImage: capaPng.url,
  corpo: [
    {
      tipo: "p",
      texto:
        "A partir de 1º de outubro de 2026, a Meta passa a cobrar pelas respostas que as empresas enviam aos clientes no WhatsApp depois de uma franquia mensal. Para quem tem um volume alto de atendimento, isso muda a conta no fim do mês. O WebChat chega justamente para dar uma alternativa: um canal de atendimento que funciona direto no navegador, integrado ao Elora CRM, e que não passa pela Meta.",
    },
    {
      tipo: "p",
      texto:
        "Neste guia você vai ver o que é o WebChat, como criar o seu em menos de um minuto, como o seu cliente usa, quanto ele pode economizar e as respostas para as dúvidas mais comuns.",
    },
    { tipo: "h2", texto: "O que é o WebChat" },
    {
      tipo: "p",
      texto:
        "O WebChat é um canal de atendimento do Elora CRM acessado por **link público** ou **QR Code**. O cliente abre o link, se identifica e já começa a conversar com a sua equipe, numa página dedicada de atendimento.",
    },
    {
      tipo: "p",
      texto:
        "Ele não depende de aplicativo instalado nem de conta em rede social. E como todo canal do Elora CRM, as conversas chegam na mesma tela de atendimento onde a sua equipe já trabalha com WhatsApp, Instagram e Messenger.",
    },
    {
      tipo: "cards",
      colunas: 3,
      itens: [
        { icone: "link", titulo: "Link público", texto: "Um link curto gerado na hora, pronto para compartilhar em qualquer lugar." },
        { icone: "qr", titulo: "QR Code", texto: "Baixe a imagem e use em embalagens, balcão, vitrine, cardápios e eventos." },
        { icone: "pagina", titulo: "Página dedicada", texto: "O cliente acessa uma página própria de atendimento e começa a conversa sem nenhuma etapa extra." },
      ],
    },
    {
      tipo: "callout",
      variante: "dica",
      texto:
        "Quer o chat dentro do seu site, com botão flutuante e as suas cores? Configure um Widget de Atendimento e vincule o canal WebChat a ele.",
    },
    { tipo: "h2", texto: "Por que usar o WebChat" },
    {
      tipo: "cards",
      colunas: 2,
      itens: [
        { icone: "livre", titulo: "Sem barreiras para o cliente", texto: "Não precisa baixar nada nem ter conta em rede social." },
        { icone: "centro", titulo: "Tudo em um só lugar", texto: "As conversas entram no Elora CRM junto com os demais canais." },
        { icone: "bot", titulo: "Chatbots aproveitados", texto: "Duplique fluxos que você já usa no WhatsApp, Instagram ou Messenger." },
        { icone: "moeda", titulo: "Sem tarifa da Meta por mensagem", texto: "O WebChat não passa pela API Oficial do WhatsApp." },
      ],
    },
    { tipo: "h2", texto: "Como criar o seu canal WebChat" },
    {
      tipo: "passos",
      itens: [
        "No menu principal, acesse **Ajustes** e depois **Canais de atendimento**.",
        "No topo da tela, clique em **Novo canal** e selecione **WebChat**.",
        "Preencha o **Nome do canal** (obrigatório, é o nome que o visitante vê). Se quiser, troque o **Ícone de perfil** em \"Alterar\" e escolha se quer manter o **Indicador de digitando**, que mostra \"digitando...\" ao visitante e some 20 segundos depois que o agente para de digitar.",
        "Clique em **Salvar alterações**. O sistema gera na hora um link curto (por exemplo, wshort.me/jiKV), com botão \"Copiar\", e o QR Code, disponível em \"Baixar QR Code\".",
      ],
    },
    {
      tipo: "callout",
      variante: "atencao",
      texto:
        "Cada conta pode ter até 2 canais WebChat ativos. No link e no QR Code, a cor do chat é sempre azul. Para personalizar a aparência, use o Widget de Atendimento.",
    },
    { tipo: "h2", texto: "Onde divulgar o link e o QR Code" },
    {
      tipo: "p",
      texto:
        "O link funciona bem na bio das redes sociais, na assinatura de e-mail, em respostas automáticas e no rodapé do site. O QR Code rende mais no mundo físico: embalagens, notas fiscais, balcão, vitrine, cardápios, crachás e materiais de eventos.",
    },
    { tipo: "h2", texto: "Como o seu cliente entra na conversa" },
    {
      tipo: "fluxo",
      itens: [
        { icone: "link", titulo: "Acessa", texto: "Abre o link ou escaneia o QR Code." },
        { icone: "usuario", titulo: "Se identifica", texto: "Preenche nome completo e WhatsApp e marca o termo de consentimento (\"Concordo com o uso dos meus dados para fins de atendimento e comunicações da empresa\")." },
        { icone: "chat", titulo: "Conversa", texto: "O atendimento é criado automaticamente e a mensagem \"Vamos conversar\" abre o chat." },
      ],
    },
    {
      tipo: "p",
      texto:
        "Se o cliente já tiver um atendimento em andamento, ele cai direto nessa conversa. Se o atendimento for concluído enquanto ele ainda está na tela, aparece o botão \"Iniciar nova conversa\".",
    },
    { tipo: "h3", texto: "O que o cliente pode fazer no chat" },
    {
      tipo: "cards",
      colunas: 3,
      compacto: true,
      itens: [
        { icone: "emoji", titulo: "Textos e emojis", texto: "Seletor com busca e categorias." },
        { icone: "arquivo", titulo: "Arquivos", texto: "Câmera, imagem, vídeo ou qualquer arquivo, até 10 por envio e 50 MB cada." },
        { icone: "audio", titulo: "Áudio", texto: "Grava, pausa, descarta ou envia na hora." },
        { icone: "dispositivo", titulo: "Outro dispositivo", texto: "Continua a conversa em outro aparelho com QR Code e código de 6 dígitos." },
        { icone: "sair", titulo: "Encerrar sessão", texto: "Faz logoff naquele aparelho sem fechar o atendimento." },
        { icone: "status", titulo: "Online ou Offline", texto: "O status segue o horário de atendimento configurado em Ajustes > Conta > Horário de atendimento." },
      ],
    },
    { tipo: "h3", texto: "Como o cliente retoma conversas anteriores" },
    { tipo: "p", texto: "Pelo botão \"Já possui acesso? Entre agora\", o cliente recupera o histórico:" },
    {
      tipo: "passos",
      itens: [
        "Informa o telefone usado nos atendimentos anteriores.",
        "Recebe um código de 6 dígitos pelo WhatsApp.",
        "Digita o código na tela \"Validação de acesso\" (se não chegar, pode pedir o reenvio).",
        "Clica em \"Continuar\" e vê as conversas.",
      ],
    },
    {
      tipo: "p",
      texto:
        "O código só é pedido quando o telefone já foi usado em algum WebChat ou widget da empresa e não há sessão salva no navegador, por exemplo em outro aparelho, em um navegador sem histórico ou depois de mais de 30 dias sem acesso. No primeiro uso, basta o formulário.",
    },
    { tipo: "h2", texto: "Chatbots e envio via API" },
    {
      tipo: "p",
      texto:
        "Você não precisa criar fluxos do zero. É possível duplicar um chatbot que já funciona no WhatsApp, Instagram ou Messenger e migrar para o WebChat, mantendo a mesma lógica.",
    },
    {
      tipo: "p",
      texto:
        "Também é possível enviar mensagens via API usando o WebChat como canal de origem. Use o endpoint de envio de mensagens da plataforma: em `from`, informe o ID do canal WebChat (campo \"Id\", no topo da tela de configuração do canal) e, em `to`, o telefone do contato.",
    },
    {
      tipo: "codigo",
      codigo: `{
  "from": "21d4d838-c957-4c97-8913-dde3d6c178b1",
  "body": { "text": "Olá" },
  "to": "33999001111"
}`,
    },
    { tipo: "h2", texto: "WebChat x API Oficial do WhatsApp: quanto custa cada um" },
    { tipo: "h3", texto: "Como a Meta cobra na API Oficial" },
    {
      tipo: "p",
      texto:
        "Desde julho de 2025, a Meta cobra por mensagem entregue, de acordo com a categoria. As mensagens que o cliente envia para a empresa não são cobradas. Os valores abaixo são as tarifas públicas da Meta para o Brasil e são cobrados à parte do plano do Elora CRM.",
    },
    {
      tipo: "tabela",
      cabecalho: ["Categoria", "Quando é usada", "Valor por mensagem"],
      linhas: [
        ["Marketing", "Promoções, campanhas, reativação de clientes", "R$ 0,3217"],
        ["Utilidade", "Confirmação de pedido, status de entrega, lembretes", "R$ 0,0350"],
        ["Autenticação", "Códigos de verificação", "R$ 0,0350"],
        ["Serviço", "Respostas do atendente dentro da janela de 24h aberta pelo cliente", "1.000 grátis por número por mês, depois R$ 0,0350"],
      ],
    },
    {
      tipo: "callout",
      variante: "atencao",
      texto:
        "**O que muda em 1º de outubro de 2026:** as mensagens de serviço, que eram gratuitas, passam a ser cobradas depois das 1.000 gratuitas por número de telefone por mês. Os modelos de utilidade enviados dentro da janela de 24h também deixam de ser gratuitos. Conversas iniciadas por anúncios de clique para o WhatsApp continuam gratuitas por 72 horas.",
    },
    { tipo: "h3", texto: "Comparativo lado a lado" },
    {
      tipo: "tabela",
      cabecalho: ["", "WebChat", "API Oficial do WhatsApp"],
      linhas: [
        ["Custo por mensagem", "Sem tarifa da Meta", "Cobrança por mensagem conforme a categoria"],
        ["Quem inicia a conversa", "O cliente, pelo link ou QR Code", "Cliente ou empresa (a empresa só com modelo aprovado)"],
        ["Janela de 24 horas", "Não se aplica", "Obrigatória para mensagens livres"],
        ["Modelos de mensagem", "Não precisam de aprovação", "Precisam ser aprovados pela Meta"],
        ["Número de telefone", "Não precisa", "Precisa de um número dedicado"],
        ["Notificação no celular", "O cliente vê a resposta ao voltar para a página", "Chega no WhatsApp com notificação"],
        ["Melhor uso", "Atendimento receptivo: site, loja, embalagem, redes", "Contato ativo: campanhas, avisos, cobranças"],
      ],
    },
    { tipo: "h3", texto: "Um exemplo real de conta" },
    {
      tipo: "p",
      texto:
        "Imagine uma empresa com 1.000 atendimentos por mês, uma média de 8 respostas do atendente por atendimento (8.000 mensagens de serviço) e 300 conversas iniciadas pela empresa com modelo de marketing.",
    },
    {
      tipo: "tabela",
      destacarUltima: true,
      cabecalho: ["Item", "API Oficial até 30/09/2026", "API Oficial a partir de 01/10/2026", "WebChat"],
      linhas: [
        ["8.000 respostas de serviço", "R$ 0,00", "R$ 245,00", "R$ 0,00"],
        ["300 modelos de marketing", "R$ 96,51", "R$ 96,51", "Não se aplica"],
        ["Total estimado por mês", "R$ 96,51", "R$ 341,51", "R$ 0,00"],
      ],
    },
    {
      tipo: "p",
      texto:
        "Na prática, a economia vem de levar para o WebChat o atendimento receptivo (dúvidas, suporte, pós-venda) e deixar o WhatsApp Oficial para os momentos em que a empresa precisa chamar o cliente. Quanto maior o volume de respostas da sua equipe, maior a diferença.",
    },
    { tipo: "simulador" },
    {
      tipo: "cta",
      titulo: "Quer ver quanto a sua operação economiza?",
      texto: "Fale com o nosso time e ative o WebChat na sua conta.",
    },
    { tipo: "h2", texto: "Cuidados antes de remover um canal" },
    {
      tipo: "p",
      texto:
        "Para remover um canal, abra-o em Canais de atendimento, clique em \"Remover canal\", confirme que está ciente e informe o código de 6 dígitos enviado ao e-mail do administrador.",
    },
    {
      tipo: "callout",
      variante: "atencao",
      texto:
        "A remoção é irreversível. Atendimentos pendentes ou em andamento são concluídos automaticamente, o link e o QR Code param de funcionar na hora e o canal não pode ser reconectado. Um novo canal nasce sem vínculo com o anterior.",
    },
    { tipo: "h2", texto: "Perguntas frequentes" },
    {
      tipo: "faq",
      itens: [
        {
          pergunta: "Posso chamar o cliente proativamente pelo WebChat ou só responder?",
          resposta:
            "O WebChat é pensado para o cliente iniciar a conversa. A sua equipe responde e conversa normalmente enquanto o atendimento estiver aberto, e também é possível enviar mensagens via API usando o WebChat como canal de origem, para contatos que já se identificaram no chat. A diferença é que o WebChat não é um aplicativo no celular do cliente: ele vê a mensagem quando volta para a página do WebChat. Para chamar o cliente de forma ativa, com notificação no celular, use o WhatsApp.",
        },
        {
          pergunta: "Preciso de um número de WhatsApp para usar o WebChat?",
          resposta:
            "Não. O WebChat funciona com o link e o QR Code gerados pelo Elora CRM. O WhatsApp do cliente é pedido só para identificação e para o envio do código de acesso quando ele volta por outro aparelho.",
        },
        {
          pergunta: "O WebChat substitui o WhatsApp?",
          resposta:
            "Não, ele complementa. O WebChat absorve o atendimento receptivo sem tarifa da Meta por mensagem, e o WhatsApp segue para campanhas, avisos e contatos iniciados pela empresa.",
        },
        {
          pergunta: "Existe janela de 24 horas no WebChat?",
          resposta: "Não. A janela de 24 horas é uma regra da Meta para o WhatsApp, e o WebChat não passa pela Meta.",
        },
        {
          pergunta: "O cliente precisa baixar algum aplicativo?",
          resposta: "Não. O chat abre direto no navegador do celular ou do computador.",
        },
        {
          pergunta: "Se o cliente fechar a página, perde a conversa?",
          resposta:
            "Não. A sessão fica salva no navegador por 30 dias. Em outro aparelho, ele entra por \"Já possui acesso? Entre agora\" com o código enviado pelo WhatsApp, ou usa \"Abrir em outro dispositivo\" a partir do chat aberto.",
        },
        {
          pergunta: "Quando o cliente clica em \"Encerrar sessão\", o atendimento é finalizado?",
          resposta:
            "Não. Encerrar a sessão só faz logoff naquele aparelho. O atendimento continua aberto no Elora CRM até a sua equipe concluir.",
        },
        {
          pergunta: "Posso mudar a cor do WebChat?",
          resposta:
            "No link e no QR Code a cor é sempre azul. Para personalizar cores e aparência, use o Widget de Atendimento no seu site.",
        },
        { pergunta: "Quantos canais WebChat posso ter?", resposta: "Até 2 canais ativos por conta." },
        {
          pergunta: "Posso usar os chatbots que já tenho?",
          resposta: "Sim. Duplique o chatbot do WhatsApp, Instagram ou Messenger e migre para o WebChat.",
        },
        {
          pergunta: "Qual o limite de arquivos?",
          resposta:
            "Até 10 arquivos por envio e 50 MB por arquivo. Acima disso, o sistema pede para compactar o arquivo antes de enviar.",
        },
        {
          pergunta: "Como fica a LGPD?",
          resposta:
            "Antes de iniciar a conversa, o cliente precisa marcar o termo de consentimento para uso dos dados no atendimento e nas comunicações da empresa. Sem esse aceite, o chat não abre.",
        },
      ],
    },
    {
      tipo: "cta",
      final: true,
      titulo: "Pronto para começar?",
      texto: "Ajustes > Canais de atendimento > Novo canal > WebChat.",
    },
    {
      tipo: "nota",
      texto:
        "Fonte das tarifas: Meta for Developers, \"Pricing on the WhatsApp Business Platform\". Valores de referência para o Brasil em setembro de 2026, sujeitos a alteração pela Meta.",
    },
  ],
};
