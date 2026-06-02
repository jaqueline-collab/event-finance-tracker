## Resumo

1. Cliente "Brands Outlet Joinville" não existe no banco
2. Aprimorar tabela de Clientes: nova coluna, ocultar parceiro e adicionar filtros

## 1. Brands Outlet Joinville

Confirmei direto no banco: **não existe nenhum cliente com esse nome** (busca por `%brand%` e `%joinville%` retorna zero linhas). Os 15 clientes existentes são: Camila Ahrens, Dr Alexandre Mansur, Dr Jonas Lenzi, Dr Pedro Augusto, Dra Estéfani, Dra Tatiana Patruni, Dra. Anna Karoline, Dra. Gabriele Fracaro, Dra. Isabela Zanini, Dra. Vania Almeida, Érico Servano, Instituto Murilo Fischer, INTEP's Treinamentos, Majestic Transplante Capilar, ZAYN CLINICA LTDA.

**Ação proposta:** me confirmar se o nome está em outro lugar (ex.: foi excluído por engano, está em outro ambiente, ou tem outro nome real). Se quiser, eu **crio** o cliente Brands Outlet Joinville já com data de setup 12/02/2026 e status cancelado — me diga plano, parceiro e data de churn.

Também vou **adicionar campo de edição de Data de Setup no front** (modal Editar do cliente), pra que situações assim você consiga corrigir sozinho sem depender de backend.

## 2. Aba Clientes — colunas e filtros

### Colunas
- **Adicionar:** "Lucro sob o sistema" — receita do sistema (MRR menos Acompanhamento) menos custo operacional, mesma fórmula do dashboard.
- **Ocultar:** coluna "Parceiro" da tabela principal (continua disponível no detalhe/edição do cliente e no filtro).

### Filtros (barra acima da tabela)
- **Data Setup** — range (de / até)
- **Data Churn** — range (de / até) + opção "sem churn"
- **Parceiro** — select com todos os parceiros cadastrados
- **Plano** — select com todos os planos cadastrados
- **Situação** — Trial / Ativo / Cancelado
  - *Trial* = ativo e dataInicio dentro dos últimos 14 dias (confirmar regra)
  - *Ativo* = sem dataChurn
  - *Cancelado* = com dataChurn

Filtros combinam com a busca por nome já existente. Botão "Limpar filtros".

## Arquivos afetados
- `src/routes/clientes.tsx` — colunas, filtros, edição da data de setup
- Possível extração de um componente `<ClientesFiltros />` se ficar muito grande

## Perguntas
1. Confirma se devo **criar** o cliente Brands Outlet Joinville, ou existe outro nome a corrigir?
2. Regra de "Trial" — usar os últimos 14 dias desde a data de setup, ou outra definição?
