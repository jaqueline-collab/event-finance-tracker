# Fase 1 — Visual do Painel do cliente (Dr. Ricardo, 8c0ojhr2)

Alvo visual: páginas "dash claro" e "dash escuro" do desenho enviado. Fundo cinza claro, cartões brancos com borda fina e cantos arredondados; indicadores com ícone em quadradinho colorido, valor grande e selo de variação ao lado; grade em linhas de 2/3 + 1/3 (gráfico largo à esquerda, rosca ou ranking à direita) e linhas de 1/3 + 2/3 embaixo; ranking com barras de progresso; tabela de atendentes com iniciais em círculo. Botão "Editar dash" escuro no cabeçalho só para super admin. Ao final, comparo com o desenho e listo o que ficou diferente.

## O que a cliente vai ver
1. **Cabeçalho**: nome da clínica pequeno, título da visão em Space Grotesk; à direita seletor de período (7 dias, 30 dias [padrão], Este mês, Mês passado, Personalizado) com as datas visíveis, fuso America/Sao_Paulo.
2. **Visões em abas sublinhadas** (troca das pílulas atuais). "Relatório diário" continua fixa. "+ Nova visão" só para super admin em Editar.
3. **Chips de filtro**: Canal, Origem, Atendente, Etiqueta, Campanha, com valores reais do cliente. À direita "atualizado há X min" (última sincronização).
4. **4 indicadores** com ícone, valor animado e selo de variação contra o período anterior de mesmo tamanho (verde/vermelho/cinza, com seta e texto, não só cor):
   Novos leads · Conversas realizadas (regra validada do relatório diário) · TMR e TMA ("1h 20min", com "N conversas medidas") · Leads de ADS (com % do total).
5. **Grade de gráficos como no desenho (2/3 + 1/3 no computador, 1 coluna no tablet e celular)**:
   Leads por dia (barras com ADS empilhado) · Conversas por dia (Usuário x Bot) · Leads por origem (rosca com total no centro; troca Origem/Canal/Etiqueta/Campanha) · Principais campanhas (top 8) · Atendimentos por canal (nome do canal) · Conversas por atendente (tabela com iniciais, números e barrinha).
6. **Interatividade**: dica ao passar o mouse com valor e %; clicar em barra/fatia/linha vira chip removível e recalcula tudo; "Limpar filtros"; legenda liga/desliga série; animações de entrada respeitando "reduzir movimento"; troca de período sem piscar, com esqueletos; estado vazio claro ("Nenhum lead neste período"); foco por teclado e descrição textual nos gráficos.
7. Menu "⋯" nos cartões só para super admin em Editar. Sem menu no topo (o do desenho não será criado). Nada vazio, desativado ou "em breve".

## O que não muda
Menu lateral da Área do cliente; widgets, visões e filtros salvos; Dr. Gean e demais clientes (seguem no painel atual); financeiro; texto das mensagens nunca lido.

## Detalhes técnicos
- Nova função de servidor `getPainelVisual({clienteId, inicio, fim, filtros})` em `painel-visual.functions.ts`: valida acesso (equipe interna ou usuário do cliente), só para clientes com espelho completo (`usaEspelho`), filtra por `cliente_id`, devolve apenas agregados (indicadores atuais e anteriores, séries por dia, top N por dimensão, opções dos chips, última sincronização de `elora_sync_estado`). Mensagens lidas só em colunas de direção/tipo/userId/bot/data.
- Agregação no servidor; se o volume exigir, uma função SQL `security definer` restrita ao service role (sem nova tabela, sem alterar dados).
- Lógica pura testável em `src/lib/painel-visual.ts`: períodos e período anterior em São Paulo, formato "1h 20min", variação %, regra de conversa realizada/usuário/bot, aplicação de filtros. Testes novos para cada regra (incluindo os valores 22/09–03/10 já conferidos com o monday).
- Componentes: `painel-visual/` (cabeçalho, chips, indicadores, cartões) usando Recharts e tokens existentes (`--chart-1..5`, `--card`, `--brand-soft`), claro e escuro. Integração em `area-do-cliente.index.tsx` e troca das pílulas por abas em `visoes-painel.tsx`. Clientes sem espelho mantêm `resultados-cliente.tsx`.
- Servidor recusa controles de edição para quem não é super admin (já existe `exigirSuperAdmin`).
- Entrega: rodar testes, capturas em 390/834/1440 nos dois temas (a verificação logada pode não ser possível no Supabase externo; aviso se não for), lista do que foi apagado, parar sem publicar.
