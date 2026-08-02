# Remover a classificação automática de "Trial"

## O que está acontecendo

O cliente **Cirurgiões Staffs - Fischer** está no banco, sem data de churn, com setup em 26/07/2026. A tela de Clientes classifica quem tem até 14 dias de setup como "Trial" e, nesse caso, **não** como "Ativo" — por isso ele sumia ao filtrar por Ativo.

## Onde essa regra existe hoje

Verifiquei o projeto inteiro: a regra dos 14 dias aparece **apenas** na tela de Clientes (`src/routes/clientes.tsx`) — no cálculo do filtro de situação e na opção "Trial (até 14 dias)" da barra de filtros. Dashboard, contadores e demais telas já usam apenas "sem data de churn = ativo", então não precisam de mudança.

## Mudança

- Todo cliente sem data de churn passa a ser classificado apenas como **Ativo**.
- Todo cliente com data de churn continua **Cancelado**.
- A opção de filtro "Trial (até 14 dias)" é removida da barra de filtros da tela de Clientes.
- Se algum filtro salvo do navegador ainda contiver "trial", ele é ignorado sem quebrar a tela.

Nenhum dado de cliente é alterado — a mudança é só de classificação e exibição.

## Detalhe técnico

Em `src/routes/clientes.tsx`: remover `isTrial`/`dias` do bloco de `situacaoSel` em `clientesFiltrados` (rótulos passam a ser só `cancelado` / `ativo`) e remover a entrada `{ value: "trial", ... }` das opções do `FilterBar`.