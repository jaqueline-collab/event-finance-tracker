## 1. "Clientes ativos" deve mostrar só o número de ativos

Hoje exibimos `ativos / total` (ou um hint "X no total") em dois lugares:

- **`src/routes/clientes.tsx`** (card de resumo da carteira) — remover o `/ {clientesFiltrados.length}` ao lado do número.
- **`src/routes/dashboard.tsx`** (KPI "Clientes ativos") — remover o `hint: "${clientes.length} no total"`.

Resultado: o número exibido será exclusivamente a contagem de clientes ativos (`!dataChurn`), respeitando os filtros aplicados quando houver.

## 2. Investigar "Lucro sobre o sistema" negativo

Na tabela da aba **Clientes**, a coluna **Lucro sob o sistema** é calculada como:

```
lucroSistema = receitaSistemaCliente - custoMensalCliente
             = (receita_total - valorAcompanhamento) - custo_helena_líquido
```

Ou seja, o valor de **acompanhamento (consultoria)** é descontado da receita antes de comparar com o custo do sistema (Helena/canais/usuários). Quando o plano tem acompanhamento alto, a "receita do sistema" fica pequena e pode ficar abaixo do custo operacional — gerando lucro negativo mesmo que o cliente seja lucrativo no total.

**Próximo passo (investigação, sem alterar código):** rodar uma query no banco listando os clientes ativos com `receitaSistema − custo < 0`, mostrando para cada um: receita total, acompanhamento, receita sistêmica, custo estimado e plano. Assim você consegue ver caso a caso se o negativo é (a) esperado pelo desenho do plano (acompanhamento "subsidia" o sistema) ou (b) algum cliente fora da curva que precisa revisão de preço.

Depois de ver a lista, decidimos se:
- ajustamos a fórmula da coluna (ex.: considerar acompanhamento como receita do sistema também), ou
- mantemos como está e tratamos caso a caso comercialmente.

## Detalhes técnicos

Mudanças de UI são pontuais (2 arquivos, ~3 linhas). A parte 2 é diagnóstico — não toca código até decidirmos o que fazer com os clientes negativos.
