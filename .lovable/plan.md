## Visão geral

Quatro frentes, implementadas na ordem abaixo (cada uma depende da anterior para os cálculos baterem):

1. Ciclo de faturamento no plano (data inicial, data final, dia de vencimento, flag proporcional)
2. Ciclo personalizado por cliente
3. Cálculo proporcional para movimentos no meio do ciclo (setup, upgrade, downgrade, churn)
4. Bug do resumo mensal: considerar TODOS os movimentos dentro do ciclo
5. Componente de filtros estilo Monday (Resumo + Clientes + Financeiro)

---

## 1) Ciclo de faturamento no plano

**Migration** adiciona em `elora_planos`:
- `ciclo_dia_inicial` (int 1–31, default 1)
- `ciclo_dia_final` (int 1–31, default 30) — entende-se "último dia do mês" quando = 31
- `dia_vencimento` já existe; passa a ser o vencimento padrão do ciclo
- `cobranca_proporcional` (bool, default false) — quando true, movimentos no meio do ciclo são proporcionais

**UI em `planos.tsx`** (só aparece para categoria `elora`):
- Seção "Ciclo de faturamento":
  - Dia inicial / Dia final (selects 1–31)
  - Dia de vencimento (já existe — fica nessa mesma seção)
  - Switch: "Cobrar proporcionalmente para movimentos no meio do ciclo"

## 2) Ciclo personalizado por cliente

**Migration** em `elora_clientes`:
- `ciclo_personalizado` (bool, default false)
- `ciclo_dia_inicial` (int nullable)
- `ciclo_dia_final` (int nullable)
- (`dataVencimento` já existe e continua sobrescrevendo o do plano)

**UI no formulário de cliente** (`clientes.tsx`):
- Checkbox "Personalizar ciclo de faturamento"
- Quando marcado: dia inicial + dia final + data de vencimento

**Helper novo** `getCicloCliente(cliente, plano, ano, mes)` em `src/lib/calc/ciclo.ts`:
- Retorna `{ inicio: Date, fim: Date, diaVencimento: number, proporcional: boolean }`
- Prioridade: cliente personalizado > plano > default (1–30)

## 3) Proporcionalidade

Em `src/lib/calc/receita.ts`:
- Nova função `receitaCicloClienteProporcional(cliente, planos, custos, movimentos, year, month)`:
  - Pega o ciclo via `getCicloCliente`
  - Se `proporcional = false` → comportamento atual (snapshot no fim do ciclo)
  - Se `proporcional = true`:
    - Identifica todos os movimentos do cliente dentro do ciclo
    - Para cada "segmento" entre movimentos: calcula receita daquele snapshot × (dias_do_segmento / dias_no_ciclo)
    - Soma os segmentos
    - Setup novo cliente: se `dataInicio` cai no meio do ciclo, primeiro segmento começa a partir de `dataInicio`
    - Churn: último segmento termina em `dataChurn`
- `receitaCicloCliente` passa a delegar para a nova função

## 4) Fix do bug — fechamento considera todos os movimentos do ciclo

A regressão atual: `clienteSnapshotAt` reverte movimentos **após** uma data, mas o fechamento usa o último dia do mês civil, não o último dia do **ciclo**. Quando o ciclo termina antes do fim do mês (ex: cliente com ciclo 5→4), movimentos do mês civil entram no ciclo errado.

**Correção:**
- `receitaCicloCliente` passa a snapshotar no `fim` do ciclo retornado por `getCicloCliente` (não no último dia do mês civil)
- `resumo.tsx` agrupa movimentos por ciclo do cliente (não por mês civil)
- `clienteFaturaEm` e `obterVencimentoDaCompetencia` ganham parâmetro ciclo

## 5) Filtros estilo Monday

**Componente novo** `src/components/filter-bar.tsx`:

```text
[+ Adicionar filtro ▼]  [Plano: Pro, Free ×]  [Data: Este mês ×]  [Status: Ativo ×]
```

- API:
  ```tsx
  <FilterBar
    fields={[
      { key: 'plano', label: 'Plano', type: 'multi', options: planos },
      { key: 'data', label: 'Data', type: 'dateRange' },
      { key: 'status', label: 'Status', type: 'multi', options: [...] },
      { key: 'parceiro', label: 'Parceiro', type: 'multi', options: parceiros },
      { key: 'tipo', label: 'Tipo de plano', type: 'multi', options: ['elora','consultoria'] },
    ]}
    value={filters}
    onChange={setFilters}
  />
  ```
- `type: 'multi'` → popover com checkboxes + busca
- `type: 'dateRange'` → presets ("Hoje", "Este mês", "Mês passado", "Este ano", "Personalizado") + 2 date pickers
- Cada filtro vira um chip removível; clique no chip reabre o popover
- Filtros se acumulam com AND

**Aplicar em:**
- `resumo.tsx` — substitui os filtros atuais (mantém comportamento de "filtroTipo" como um dos filtros)
- `clientes.tsx` — substitui busca/filtros atuais (mantém o input de busca por nome separado)
- `financeiro.tsx` — substitui os filtros atuais

## Detalhes técnicos

- **Migrations:**
  - `add_ciclo_faturamento_plano.sql` — colunas em `elora_planos`
  - `add_ciclo_personalizado_cliente.sql` — colunas em `elora_clientes`
- **Tipos** (`src/lib/types.ts`):
  - `Plano`: `cicloDiaInicial`, `cicloDiaFinal`, `cobrancaProporcional`
  - `Cliente`: `cicloPersonalizado`, `cicloDiaInicial`, `cicloDiaFinal`
- **Mappers** (`src/lib/mappers.ts`): persistência dos novos campos
- **Novo arquivo** `src/lib/calc/ciclo.ts`: `getCicloCliente`, `diasNoCiclo`, `interseccaoComCiclo`
- **Atualizar** `src/lib/calc/receita.ts`: `receitaCicloCliente` reescrita para considerar ciclo configurável + proporcionalidade
- **Atualizar** `src/lib/calc/datas.ts`: `clienteFaturaEm` usa ciclo configurável
- **Novo componente** `src/components/filter-bar.tsx` + tipos compartilhados
- Substituir filtros em `resumo.tsx`, `clientes.tsx`, `financeiro.tsx`

## Riscos / decisões automáticas

- **Default ciclo:** dia 1 → último dia do mês (mantém comportamento atual)
- **Default proporcional:** false (não muda contas existentes até você ligar no plano)
- **Receita acumulada / histórico do cliente:** passam a usar a nova `receitaCicloCliente` automaticamente
- **PDF do resumo:** já consome a mesma função, então o fix do bug propaga para o relatório
