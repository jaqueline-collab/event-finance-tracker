# Perguntas frequentes com busca + nova área de Blog

## 1. Página de perguntas frequentes

- Todas as perguntas que já existiam continuam lá (são 10, já usadas na home e na página `/faq`).
- Novo campo de busca no topo da página: a pessoa digita uma palavra ("cancelar", "WhatsApp", "suporte") e a lista filtra na hora, mostrando pergunta e resposta que contêm o termo.
- O trecho pesquisado fica destacado, e o item aparece já aberto quando a busca tem resultado.
- Se nada for encontrado: mensagem simples com botão para falar no WhatsApp.
- Botão para limpar a busca e voltar à lista completa em duas colunas.

## 2. Nova aba de Blog

Estrutura moderna, limpa e interativa, em duas telas:

**Lista (`/blog`)**
- Topo escuro com título e busca por palavra-chave.
- Filtro por categoria em "pílulas" (Atendimento, Vendas, Inteligência Artificial, Gestão).
- Primeiro post em destaque, largo, com imagem grande.
- Demais posts em grade de cartões: imagem, categoria, título, resumo, autor, data e tempo de leitura. Cartões com leve elevação e zoom suave da imagem ao passar o mouse.

**Publicação (`/blog/algum-post`)**
- Cabeçalho com categoria, título, autor, data, tempo de leitura e imagem de capa.
- Texto confortável de ler (coluna estreita), com subtítulos, listas e citação em destaque.
- Barra fina de progresso de leitura no topo.
- Bloco de chamada para conhecer o Elora e sugestão de outros dois posts no final.

**Conteúdo dos mockups**: 4 publicações de exemplo, escritas em português e com imagens geradas, para você ver o resultado visual:
1. Como reduzir o tempo de primeira resposta no WhatsApp
2. Agentes de IA no atendimento: o que automatizar (e o que não)
3. Funil de vendas no WhatsApp: da conversa ao fechamento
4. 5 indicadores que todo gestor de atendimento deveria acompanhar

Os textos são de demonstração — depois você me passa os conteúdos reais e eu substituo. Se quiser publicar/editar posts direto pelo sistema (sem me pedir), isso é um segundo passo que posso montar depois.

## 3. Navegação

- Menu do topo e rodapé passam a ter "Blog", ao lado de "Parceiros" e "Perguntas frequentes".
- Na home, um bloco curto com os 3 posts mais recentes e botão "Ver todos os artigos".

## Detalhes técnicos

- `src/routes/faq.tsx`: estado de busca; filtro sobre `FAQS` (pergunta + resposta, sem acento/caixa); `FaqLista` recebe `termo` opcional para destacar e abrir automaticamente.
- `src/components/landing/FaqLista.tsx`: prop `termo` para highlight; mantém accordion atual.
- `src/lib/landing/posts.ts` (novo): tipo `Post` (slug, título, resumo, categoria, autor, data, tempo de leitura, capa, corpo em blocos) + 4 posts de exemplo.
- `src/routes/blog.index.tsx` e `src/routes/blog.$slug.tsx` (novos): `head()` próprio em cada um (title, description, og:title, og:description, og:type, twitter:card); no post, JSON-LD `BlogPosting`; 404 amigável para slug inexistente.
- `src/components/landing/BlogCard.tsx` e `ProgressoLeitura.tsx` (novos).
- `src/components/landing/SiteChrome.tsx`: link "Blog" na navbar e no rodapé.
- `src/routes/index.tsx`: seção "Do blog" com 3 posts.
- 4 imagens de capa geradas em `src/assets`, importadas como ES6.
- Paleta atual (preto, branco, azul-marinho, amarelo vivo) e tokens existentes; nada de cor fixa no componente.
- Verificação: typecheck, build e conferência visual em desktop e mobile.
