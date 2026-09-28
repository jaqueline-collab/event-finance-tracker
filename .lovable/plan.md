# Artigo do WebChat no blog + destaque na página inicial

O blog já existe (lista, página de artigo, barra de leitura, cartões). Reaproveito tudo e sigo o padrão atual. As cores seguem a paleta Elora já usada no site: o azul-marinho e o amarelo vivo atuais, bem próximos dos tons do documento. Assim o site continua com uma cor só.

## 1. Destaque na página inicial (logo abaixo do topo)
- Faixa azul-marinho com o selo NOVIDADE, o título com a parte final em amarelo e o texto do documento.
- 4 números: R$ 0 · 2 canais · 50 MB · 30 dias.
- Botões "Ler o guia completo" (amarelo, texto preto, abre o artigo) e "Quero ativar o WebChat" (contorno branco, abre o chat de atendimento que já existe no site).
- Janela de chat ilustrativa à direita ("Online", "Vamos conversar", "Digite aqui..."). No celular ela fica abaixo do texto.
- Em "Do blog", o artigo do WebChat vira o primeiro cartão, maior e com o selo "Destaque".

## 2. Lista do blog
- O artigo do WebChat aparece no topo como destaque.
- Filtros por categoria: Todos, Artigos, Novidades e Tutoriais. Os 5 artigos atuais ficam em "Artigos" e o WebChat em "Novidades". A categoria atual de cada artigo continua aparecendo no selo do cartão.
- A busca continua funcionando. Os cartões mostram o autor "Equipe Elora CRM" no WebChat.
- Bloco de newsletter antes do rodapé. O e-mail fica salvo numa lista de inscrições (e-mail, data e página de origem), e a confirmação só aparece depois que ele foi salvo. Se o e-mail já estiver na lista, não é repetido. Só a equipe interna pode ver essa lista.

## 3. Página do artigo (`/blog/webchat-elora-crm-guia-completo`)
- Barra de leitura amarela, trilha de navegação (Início > Blog > Novidades), selo, título, subtítulo, autor, data de publicação 10/09/2026 e tempo de leitura calculado pelo texto.
- Capa ilustrativa nas cores da marca: um navegador com chat e um QR Code.
- No computador, sumário fixo à direita que marca em amarelo a seção atual. No celular, o sumário vira um menu que abre e fecha no topo.
- O texto do documento entra exatamente como está, com: grades de cartões com ícones, passo a passo numerado, caixas "Dica" e "Atenção", tabelas com cabeçalho azul (que rolam para o lado no celular), bloco de código com botão Copiar, FAQ que abre uma pergunta por vez, chamada no meio e chamada final em azul.
- Simulador de custos com as fórmulas e tarifas do documento, valores em reais, dois cartões de resultado, a economia estimada e a nota de rodapé.
- Botões para compartilhar (WhatsApp, LinkedIn, copiar link) e uma lista "Continue lendo" com setas.
- Os outros artigos continuam iguais.

## 4. Busca no Google e redes sociais
Título, descrição e endereço como no documento, dados estruturados de Artigo e de Perguntas frequentes, e imagem de capa na prévia das redes sociais.

## Validação
Celular (375), tablet (768) e computador (1440), nos temas claro e escuro. Conferir que o simulador calcula certo, que o sumário acompanha a leitura, que o botão Copiar funciona, que não há travessão longo nos textos novos e que nenhum texto sobre amarelo fica branco.

## Detalhes técnicos
- `src/lib/landing/posts.ts`: tipo `Bloco` ganha `h3`, `cards`, `passos`, `callout` (dica/atencao), `tabela` (linha de destaque opcional), `codigo`, `simulador`, `faq`, `cta`. `Post` ganha `subtitulo?`, `grupo` (Artigos/Novidades/Tutoriais), `destaque?`. O tempo de leitura é calculado pelas palavras. O WebChat fica primeiro em `POSTS`.
- Novos componentes em `src/components/landing/blog/`: `BlocoArtigo`, `SumarioArtigo` (IntersectionObserver), `SimuladorWebchat`, `CodigoCopiar`, `CarrosselRelacionados`, `Compartilhar`, `Newsletter`. O FAQ usa o `FaqLista` existente.
- `WebchatDestaque` na home, entre o topo e o vídeo. `BlogCard` ganha o selo "Destaque".
- A capa é um SVG novo em `src/assets/blog/`, com uma versão PNG 1200x630 enviada via lovable-assets. og:image e twitter:image usam `https://eloracrm.com.br` + a url do asset.
- Tabela `newsletter_inscricoes` (id, email único case-insensitive, origem, criado_em). GRANT INSERT para anon/authenticated; SELECT só com is_equipe_interna(). A gravação passa por uma função de servidor pública, que valida com Zod e ignora duplicados.
- O `head()` de `blog.$slug.tsx` inclui os JSON-LD `Article` e `FAQPage` quando o artigo tem FAQ.
