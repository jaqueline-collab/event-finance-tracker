# Dashboard ampliado — só camada de visualização

Nenhum dado, cálculo de fechamento ou cadastro é alterado. Tudo é derivado em memória a partir das funções já existentes (`receitaMensalCliente`, `receitaSistemaCliente`, `custoMensalCliente`, `calcularCustoLiquidoHelena`, `clienteAtivoEm`).

## Novos blocos no Dashboard

**1. Projeção de MRR — próximos 3 meses**
Card com o MRR atual repetido nos 3 meses seguintes (mini gráfico de barras + valores), assumindo continuidade da base. Nota fixa em texto pequeno: "Projeção baseada na base atual — não prevê novos clientes ou cancelamentos."

**2. Ranking de parceiros**
Tabela com uma linha por parceiro (Rabbit Agency, Distribox, e "Sem parceiro" quando houver clientes sem vínculo): nº de clientes, receita total, custo total, lucro total e margem %. Cabeçalhos clicáveis para ordenar (padrão: lucro desc).

**3. Custo WTS como % da receita**
Card: (custo WTS total ÷ receita total) × 100, com o valor absoluto do custo abaixo. Fica ao lado do card de margem que já inclui acompanhamento, deixando claro que são indicadores distintos.

## Itens já combinados, incluídos nesta mesma entrega

- **Cards de acompanhamento**: total mensal de acompanhamento da carteira e quantos clientes têm acompanhamento > 0.
- **Ranking unificado ordenável**: substitui os dois rankings atuais (LTV e Lucro) por uma tabela única de clientes com colunas Cliente, Plano, Parceiro, Dias ativos, Receita, Custo, Lucro, Margem % — ordenável por qualquer coluna.
- **Margem média** da carteira (lucro total ÷ receita total).
- **Ticket médio por plano**: receita média por cliente de cada plano.
- **Churn do mês**: clientes com data de churn no mês corrente + taxa sobre a base do início do mês.
- **Crescimento de MRR**: variação absoluta e % vs. o mês anterior, usando a série de 12 meses já calculada.
- **Alerta de margem baixa**: bloco destacado listando clientes com margem abaixo de 20% (ou lucro negativo).

## Detalhes técnicos

- Toda a mudança fica em `src/routes/dashboard.tsx`, mais um componente novo `src/components/dashboard/ranking-table.tsx` (tabela genérica ordenável reutilizada por clientes e parceiros).
- Fonte dos números: `useStore()` (clientes, planos, custos, movimentos, parceiros) — nenhuma escrita, nenhuma chamada nova ao banco.
- Custo por cliente vem de `custoMensalCliente` (tabela WTS); o custo agregado da operação continua vindo de `calcularCustoLiquidoHelena`, para não divergir do que o Dashboard já mostra.
- Cores e estilos via tokens semânticos existentes; nada hardcoded.