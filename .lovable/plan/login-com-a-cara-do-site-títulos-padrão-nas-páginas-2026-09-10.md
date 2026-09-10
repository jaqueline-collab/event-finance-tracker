# Login com a cara do site + títulos padrão nas páginas

## 1. Tela de login (/auth) com as cores do site
- Fundo escuro do site (preto/azul-marinho) em vez do cinza atual do painel.
- Cartão de login em superfície escura com borda sutil, título em fonte de destaque.
- Botão principal "Enviar link de acesso" no amarelo vivo com texto escuro (mesmo botão do site).
- Campo de e-mail e textos com o mesmo contraste usado nas páginas institucionais.
- O menu do topo do site aparece na tela de login, com logo clicável voltando para a home.

## 2. CTA "Ainda não sou cliente"
- Abaixo do formulário, um bloco discreto: "Ainda não sou cliente" + botão que abre a conversa no WhatsApp oficial (41) 3790-0313, em nova aba.
- Presente nas duas etapas (digitar e-mail e "verifique seu e-mail").

## 3. Título da página no topo (padrão único)
- Criar um cabeçalho de página reutilizável: faixa escura logo abaixo do menu, com uma etiqueta pequena (ex.: "Conteúdo", "Ajuda", "Acesso"), o título grande da página e uma linha de apoio opcional.
- Aplicar o mesmo cabeçalho em: Perguntas frequentes, Blog, artigo do blog, Parceiros e Login.
- Assim todas as páginas de navegação passam a ter o mesmo topo, com o título visível.

## 4. Padronizar a navegação da página de Parceiros
- Hoje ela tem um menu próprio (só Início e Parceiros) e rodapé próprio.
- Passa a usar o mesmo menu e o mesmo rodapé das demais páginas, mantendo o visual preto/branco/azul-marinho do conteúdo da Rabbit.

## Detalhes técnicos
- Novo componente `PageHeader` em `src/components/landing/SiteChrome.tsx` (props: etiqueta, título, descrição), reaproveitando o gradiente radial já usado no hero.
- `src/routes/auth.tsx`: usa `Navbar`, `PageHeader`, `Footer` e tokens `landing-dark`, `landing-yellow-vivo`, `landing-fg`; CTA usa `WHATSAPP_LINK` de `src/lib/landing/contato.ts`. Nenhuma mudança na lógica de autenticação.
- `faq.tsx`, `blog.index.tsx`, `blog.$slug.tsx`, `parceiros.tsx`: substituem os blocos de topo atuais pelo `PageHeader`; `parceiros.tsx` troca menu/rodapé locais por `Navbar`/`Footer`.
- Sem alterações de dados, rotas ou backend.

## Validação
- Build sem erros e conferência visual de /auth, /faq, /blog, um artigo e /parceiros em desktop e celular.
