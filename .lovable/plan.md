# Status explícito do cliente (Ativo / Trial)

## Problema atual

Hoje a tela de Clientes decide sozinha: cliente com até 14 dias de setup vira "Trial" e some do filtro "Ativo". Foi o que aconteceu com **Cirurgiões Staffs - Fischer** (setup 26/07/2026). Essa regra automática existe só na tela de Clientes; nenhuma outra tela usa trial.

## O que será feito

**1. Novo campo no banco**
Uma nova coluna de status no cadastro de clientes, aceitando "ativo" ou "trial", com padrão "ativo". Todos os clientes já existentes recebem "ativo" (inclusive os cinco cadastrados em julho). Nenhum outro dado de cliente é tocado.

**2. Campo no formulário**
No modal de Novo Cliente, um select "Status inicial" com Ativo (pré-selecionado) e Trial. O mesmo campo aparece ao editar um cliente, permitindo trocar de Trial para Ativo (ou o contrário) a qualquer momento e salvar normalmente.

**3. Classificação passa a ser manual**
O cálculo por dias desde o setup é removido. A situação vem sempre do campo:

```text
tem data de churn        -> Cancelado
status = trial           -> Trial
status = ativo           -> Ativo
```

Um cliente aparece em exatamente um dos filtros — nunca em dois.

**4. Exibição**
Na lista, clientes em Trial ganham um selo "Trial" para ficarem visíveis de imediato; o resto da tela segue igual. O rótulo do filtro deixa de dizer "até 14 dias".

## Detalhe técnico

- Migração: `ALTER TABLE public.elora_clientes ADD COLUMN status_comercial text NOT NULL DEFAULT 'ativo'`, com validação por trigger/CHECK simples de valores permitidos e `UPDATE` setando `'ativo'` em todas as linhas existentes.
- `src/lib/types.ts`: `Cliente.statusComercial: "ativo" | "trial"`.
- `src/lib/mappers.ts`: incluir `status_comercial` no mapeamento de ida e volta e na lista de campos de update parcial.
- `src/lib/store.ts` / `src/lib/clientes.schemas.ts` / `clientes.functions.ts`: propagar o campo no cadastro e na edição (default `"ativo"` quando ausente).
- `src/routes/clientes.tsx`: select no formulário (novo e edição), remoção de `isTrial` por dias no filtro de situação, rótulo `"Trial"` na opção de filtro e badge na tabela.