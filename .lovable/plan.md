# Página de Parceiros — Rabbit Agency

## Objetivo
Reescrever a página `/parceiros` como uma landing dedicada à parceria EloraCRM + Rabbit Agency, usando a identidade visual da agência (preto, branco, azul marinho) e a foto do fundador Paulo Coelho.

## Decisões confirmadas
- Foto do fundador: a imagem preto e branco na poltrona.
- Monday: citado como ferramenta que a Rabbit usa e que integra com o Elora, gerando dashboards interativos e personalizados.
- Estrutura: página nova, não apenas ajuste da página antiga.
- Menu superior da página de Parceiros: apenas "Início" e "Parceiros".

## Estrutura da nova página

### 1. Hero
- Fundo escuro (preto/azul marinho) com gradiente sutil.
- Badge "Parceiro oficial".
- Headline: "EloraCRM + Rabbit Agency — a máquina de vendas de clínicas e negócios de saúde".
- Subheadline sobre processos 100% integrados.
- Foto do Paulo Coelho (P&B) em destaque, posicionada ao lado do texto em desktop.
- CTA para site da Rabbit e Instagram.

### 2. Sobre a parceria
- Bloco explicando que a Rabbit é parceira oficial EloraCRM.
- Destaque para: treinamento 6 mãos, SDR dedicado, Social Seller.
- Ícones/ilustrações minimalistas.

### 3. Máquina de vendas ponta a ponta
- Passo a passo visual:
  1. Rabbit gera e qualifica a demanda.
  2. Lead entra na central Elora (WhatsApp, Instagram, Messenger).
  3. SDR e cadências automáticas qualificam.
  4. CRM acompanha até a consulta agendada e o retorno.

### 4. Integração com Monday
- Bloco sobre controle de leads e conversões com dashboards interativos e personalizados.

### 5. CTA final
- Convite para conversar com a Rabbit ou acessar o Elora App.

### 6. Footer
- Manter o footer atual da Elora, ajustando navegação se necessário.

## Identidade visual
- Cores principais: preto (#0a0a0a), branco (#ffffff), azul marinho (#1e3a5f ou similar).
- Aplicar tokens novos em `src/styles.css` sem quebrar os tokens existentes do app (`--color-rabbit-*`).
- Tipografia: manter as fontes atuais do projeto (Space Grotesk + Inter).

## Assets
- Fazer upload da foto escolhida do Paulo Coelho via `lovable-assets` para `src/assets/paulo-coelho-rabbit.png.asset.json`.
- Remover a versão local binária após gerar o ponteiro.

## Arquivos alterados
- `src/routes/parceiros.tsx`: reescrever layout, menu superior reduzido (Início e Parceiros), head SEO atualizado.
- `src/components/landing/Parceiros.tsx`: reescrever como componente da landing da Rabbit.
- `src/styles.css`: adicionar tokens semânticos `--color-rabbit-*` para preto, branco e azul marinho.

## SEO
- Title: "Rabbit Agency — Parceiro Oficial EloraCRM".
- Meta description citando parceria, máquina de vendas e saúde.
- OG tags e canonical para `/parceiros`.

## Validação
- Rodar build (`tsgo` + observar build-errors.log).
- Verificar preview em `/parceiros` em desktop e mobile.
- Confirmar que o menu superior exibe apenas Início e Parceiros.
