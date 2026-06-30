## Descontos no Resumo Mensal + auditoria Majestic

### 1. Modelo de desconto (banco)

Nova tabela `elora_descontos`:

```text
id, cliente_id, tipo ('valor' | 'percentual' | 'isencao_total'),
escopo ('cliente' | 'fechamento_inteiro'),
valor (numérico, nulo quando isenção),
competencia_inicio (YYYY-MM, primeira competência aplicada),
competencia_fim (YYYY-MM, null = sem fim),
recorrente (bool), motivo (texto), criado_em
```

- `escopo = 'cliente'`: abate do total daquele cliente na competência.
- `escopo = 'fechamento_inteiro'`: abate do total geral do relatório do mês (linha "Desconto global").
- `tipo = 'isencao_total'` + `escopo = 'cliente'`: zera a cobrança do cliente naquele mês.
- `recorrente = false`: vale só na `competencia_inicio`.
- `recorrente = true`: vale de `competencia_inicio` até `competencia_fim` (ou infinito se null).

Grants + RLS no padrão das outras tabelas Elora.

### 2. UI no Resumo Mensal

- Em cada linha do cliente: botão "Aplicar desconto" → modal com
  - Tipo: Valor (R$) / Percentual (%) / Isentar cobrança inteira
  - Recorrência: Só nesta competência / Recorrente (com data fim opcional)
  - Motivo (texto livre)
- Acima da tabela: botão "Desconto no fechamento" (escopo global) com os mesmos campos exceto isenção.
- Coluna nova "Desconto" entre Valor bruto e Valor líquido; total do rodapé passa a mostrar bruto, descontos, líquido.
- Chip removível ao lado do nome do cliente quando há desconto ativo na competência (clicar abre/edita/remove).
- Tudo entra no PDF do fechamento como linha discriminada com o motivo.

### 3. Cálculo

`receitaCicloCliente` continua intacta (cobrança cheia por padrão).
Camada nova `aplicarDescontos(valorBruto, descontosDaCompetencia)` aplicada no Resumo:

1. Por cliente: aplica todos os descontos com `escopo='cliente'` da competência (soma valores, soma %, isenção sobrepõe e zera).
2. Soma os líquidos → total bruto descontado.
3. Aplica descontos `escopo='fechamento_inteiro'` sobre esse total.

KPIs do topo e PDF passam a refletir o líquido; o bruto fica visível como referência.

### 4. Auditoria Majestic (entrega em texto, sem alterar banco)

Antes do desconto, gero o comparativo Majestic × Monday para fevereiro/março/abril:

- Estado cadastrado no app (plano, ciclo, valor mensal, assessoria, canais, usuários, transcrição, Z-API, IA).
- Movimentos cadastrados (datas e deltas).
- Valor calculado pelo app em cada competência.
- Valor do Monday em cada competência (Sistema + Assessoria).
- Diferença e hipótese: upgrade faltando, data divergente, módulo a mais/menos.
- Lista final do que precisa ser cadastrado para o app bater com o Monday — você confirma antes de qualquer alteração.

### 5. Ordem de execução

1. Migration `elora_descontos` + grants/RLS.
2. Store + tipos + mappers.
3. Cálculo `aplicarDescontos` + integração no Resumo (tabela, KPIs, PDF, prévia).
4. Modal de desconto por cliente + global, com chips removíveis.
5. Auditoria Majestic em texto.

### Detalhes técnicos

- A persistência é por `competencia_inicio` (mês de início do ciclo), coerente com a semântica vigente no app.
- Para recorrentes, o filtro no Resumo busca `competencia_inicio <= comp <= coalesce(competencia_fim, comp)`.
- Edição/remoção via mesmo modal; histórico fica preservado pelo `criado_em`.
- Os descontos não tocam em `elora_movimentos` — são uma camada de cobrança, não de assinatura.
