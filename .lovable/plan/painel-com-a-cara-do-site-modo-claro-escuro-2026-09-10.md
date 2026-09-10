# Painel com a cara do site + modo claro/escuro

Etapa 1: deixar o painel de controle com a mesma identidade visual do site (preto, branco, azul-marinho e amarelo vivo) e permitir alternar entre modo escuro e claro. As áreas de cliente e de parceiro ficam para a etapa seguinte.

## O que muda

**1. Botão de tema no topo**
- Um botão de sol/lua no cabeçalho do painel, ao lado do e-mail e do "Sair".
- Padrão: escuro. A escolha fica salva no navegador e vale para as próximas visitas.
- Sem piscar de tela clara ao carregar.

**2. Modo claro de verdade**
- Hoje o painel só tem uma paleta escura. Passa a ter duas paletas completas: clara (fundo branco, textos escuros) e escura (a atual, ajustada).
- Menu lateral, cartões, tabelas, formulários, gráficos e avisos seguem a paleta escolhida — nada fica ilegível no claro.

**3. Identidade do site no painel**
- Mesma família de fontes do site (Space Grotesk nos títulos, Inter no texto).
- Azul-marinho como cor principal e amarelo vivo como destaque (botão principal, item ativo do menu, badges), no lugar do azul/verde atuais.
- Marca do topo do menu lateral igual à do site (símbolo Elora + "EloraCRM").

**4. Ajuste fino de leitura**
- Cartões e tabelas com contraste e espaçamento revisados nos dois temas, já que hoje "tudo parece muito escuro".

## Detalhes técnicos

- `src/styles.css`: mover a paleta atual de `:root` para `.dark` e criar uma paleta clara em `:root`, reaproveitando os tokens de landing (`--color-landing-*`) para primary/accent/sidebar. Manter `@theme inline` intacto.
- Novo `src/components/theme-toggle.tsx` + um pequeno provider (classe `dark` no `<html>`, valor em `localStorage`, script inline no `RootShell` para evitar flash).
- `src/routes/__root.tsx`: renderizar o botão no header do app; script anti-flash no shell.
- `src/components/app-sidebar.tsx`: trocar o bloco degradê do cabeçalho pelo `EloraMark` e wordmark.
- Nenhuma mudança em dados, permissões, login ou funções de servidor. O site institucional (`/`, `/parceiros`, `/faq`, `/blog`) continua sempre com o tema escuro próprio dele.

## Próxima etapa (não incluída aqui)

- Área do cliente: login por e-mail cadastrado por você, com menu lateral próprio (Plano e serviços contratados, Gerenciar time, Manual da ferramenta, Voltar para o site) e redirecionamento automático conforme o tipo de acesso.
- Ampliar a área do parceiro no mesmo padrão.
