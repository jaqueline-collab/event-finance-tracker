# Corrigir erro 500 no registro do relatório diário

## Causa confirmada

A tabela `elora_relatorio_diario` tem a coluna `atualizado_em` (não `updated_at`), mas o trigger `trg_touch_elora_relatorio_diario` chama a função `touch_elora_parceiro_usuarios()`, que tenta gravar `NEW.updated_at` — campo inexistente nessa tabela. Por isso todo INSERT/UPDATE falha com `record "new" has no field "updated_at"`. Foi um erro de reaproveitamento na migração que criou a tabela.

## Correção

Uma migração aditiva e segura (não apaga nem altera dados):

1. Criar a função `touch_elora_relatorio_diario()` que atualiza `NEW.atualizado_em = now()` (mesmo padrão das outras funções de toque do projeto).
2. Substituir o trigger da tabela `elora_relatorio_diario` para chamar essa função nova (DROP TRIGGER apenas do trigger quebrado + CREATE TRIGGER com a função certa).

Nenhuma mudança em código do app nem nas rotas da API — a rota `registrar` já grava certo; quem quebrava era o trigger no banco.

## Validação

- Inserir e atualizar uma linha de teste para a Dra Tatiana Patruni direto no banco e confirmar que grava sem erro e que `atualizado_em` é atualizado; depois remover a linha de teste para não deixar dado falso.
- Conferir que os demais triggers que usam `touch_elora_parceiro_usuarios()` (tabelas que realmente têm `updated_at`) continuam intactos.
- Build e testes íntegros.

---

# Reorganizar a Área do Cliente: abas Dash e Relatório diário

## Menu superior

- Remover o botão "Dash". Ficam só Conta, Treinamento, Novidades e Minha equipe (e o botão "Acessar o aplicativo").
- "Conta" passa a ser a aba aberta por padrão. Os resultados passam a aparecer no topo da aba Conta, no lugar do bloco "Resultados da conta", com os cartões atuais da conta logo abaixo.

## Duas abas no lugar do bloco "Resultados da conta"

- **Dash**: exatamente o conteúdo de hoje (gráficos, resumo por período, filtros de 7/30 dias e personalizado). Nada muda nos números.
- **Relatório diário**: a tabela diária que hoje fica embaixo, que sai de lá e passa a morar só nesta aba.

## Filtro próprio na aba Relatório diário

- Atalhos "Últimos 7 dias" e "Últimos 30 dias" e mais o período personalizado com dois campos de data abertos (data inicial e data final), sempre visíveis.
- Este filtro é independente do filtro do Dash.
- Se a data inicial for depois da final, aparece um aviso e a tabela não recarrega.

## Linha de Total

- Linha "Total" fixa no topo da tabela (continua visível ao rolar), em destaque, somando cada coluna no período filtrado: Novos contatos, Novos contatos/ADS, Conversas do Usuário, Conversas do bot, Consulta agendada, Consulta agendada/ADS, Procedimento vendido e Procedimento vendido/ADS.
- Sem dados no período: continua o aviso de vazio, sem linha de total zerada.

## Detalhes técnicos

- `src/routes/area-do-cliente.tsx`: tirar `resultados` da lista do menu; aba padrão `conta`; renderizar `<ResultadosCliente>` no topo do `TabsContent value="conta"` (em largura total, acima da grade de cartões).
- `src/components/resultados-cliente.tsx`: envolver o card em `Tabs` (Dash / Relatório diário); o filtro de período atual continua só no Dash; `SecaoRelatorioDiario` ganha estado próprio de período (atalhos + dois `input type="date"`) e calcula os totais no cliente a partir das linhas já carregadas por `getRelatorioDiarioCliente`; linha de total em `thead` com `sticky top-0`.
- Sem mudança no banco nem nas regras de acesso. Validar em celular (390), tablet (834) e computador (1440), temas claro e escuro, também pelo "Ver como".
