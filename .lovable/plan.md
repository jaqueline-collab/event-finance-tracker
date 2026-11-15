# Plano: coluna "Status do lead" configurável por cliente

## O que muda para a super admin
- A coluna "Status do lead" deixa de ser fixa. No botão "Colunas" da tabela, a super admin vê a origem atual, troca a origem e edita o nome da coluna.
- Origens possíveis (lidas do catálogo Campos do Elora):
  1. Campo do contato (de sistema ou personalizado).
  2. Campo do card em um funil: escolher o funil e depois o campo, incluindo Etapa e campos personalizados do card. O campo técnico "status" (ACTIVE) aparece com o nome "Situação do card".
- Uma linha na tela explica a regra: "Se a linha for um contato ou um card de outro funil, usamos o card atualizado mais recentemente desse contato no funil escolhido; sem card nesse funil, a célula fica em branco."
- Se a linha já for um card do funil escolhido, ele usa o próprio card.
- Sem origem escolhida, a coluna fica oculta. Nenhum cliente recebe valor padrão.

## Exibição e uso
- Os valores aparecem como etiquetas coloridas. Se a API do Elora entregar a cor da etapa, usamos essa cor, igual ao funil do Elora App, com o texto ajustado para contraste AA. Se não entregar, a cor vem da paleta da marca e é sempre a mesma para o mesmo valor.
- No filtro, no agrupamento e nas dimensões, as etapas seguem a ordem do funil, e não a ordem alfabética.
- Na tabela, valor vazio fica em branco. Nos agrupamentos aparece "Sem informação".
- O mesmo campo fica disponível como filtro ("+ Filtro"), como agrupamento da tabela e como dimensão de bloco (pizza, barras, funil, Matriz por dimensão).

## Dr. Ricardo
- A origem fica gravada como Etapa do card no funil dele, por configuração e não no código.
- No relatório entram as etapas e os valores existentes, com quantos cards há em cada um, e também os valores de "Situação do card".

## Também nesta entrega
- Nomes editáveis das abas e dos blocos, inclusive a Matriz, que passa a se chamar "Relatório diário".
- Uma lista única "Colunas" para mostrar, ocultar, reordenar e fixar à esquerda. A coluna de status entra nessa mesma lista.
- O relatório final confirma esses dois itens.

## Garantias
- Retrato antes e depois de todas as visões e da Matriz nos dois períodos de referência. A coluna nova não altera nenhum total; se algum número mudar, eu paro e mostro antes de gravar.
- Nada fixo de cliente no código, e nada publicado.

## Detalhes técnicos
- Configuração por cliente em `elora_relatorio_corte_config` (nova chave jsonb `coluna_status`: `{fonte: "contato"|"card", funilId?, campo, rotulo}`). Só o servidor lê; só a super admin grava, com `exigirSuperAdmin`. A chave entra na versão de configuração do cache.
- O catálogo `campos-elora.ts` ganha campos de card por funil (`etapa_titulo` e personalizados) e o rótulo "Situação do card" para `status`. Fica em cache por cliente com versão de configuração.
- Resolução em `campos-elora.server.ts`: um mapa contato → card mais recente (`updated_at`) do funil, montado uma vez por requisição no `Ctx`. A mesma função serve a célula, o filtro (vira conjunto de contatos, sem juntar linhas) e a dimensão.
- Cor da etiqueta: primeiro conferir se o retorno de etapas ou funis da API traz cor (no espelho ou numa consulta de verificação). Se trouxer, guardar a cor e a ordem da etapa e aplicar a cor com o texto calculado para AA. Se não trouxer, usar um hash estável sobre a paleta de gráficos de `styles.css`. A ordem da etapa vem da posição no funil.
- O roadmap.md registra as tarefas desta entrega.
- Testes: resolução (próprio card, outro funil, sem card, card mais recente), coluna oculta sem origem, etiqueta vazia em branco e filtro e agrupamento consistentes com a célula.
