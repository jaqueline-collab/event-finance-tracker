## Problema

No "Elora · Fechamento Mensal" de **junho/2026** (que fecha o ciclo de **maio**) não aparecem Camila Ahrens (setup 12/05) nem Érico Servano (setup 07/05).

Causa: o filtro `ativos` usa `clienteFaturaEm`, que só retorna `true` quando a **data de cobrança** do cliente cai dentro do ciclo. Ambos têm `dataVencimento = 05/06/2026` (primeira cobrança em junho), então o sistema os joga para o fechamento de julho — apesar de terem sido ativados em maio.

## Regra correta (alinhada com sua expectativa)

Um cliente entra no fechamento do mês X (que fecha o ciclo X−1) quando esteve **ativo em qualquer dia do ciclo X−1**, ou seja:

- `dataInicio ≤ último dia do ciclo` **E**
- (`dataChurn` ausente **OU** `dataChurn ≥ primeiro dia do ciclo`)

Isso mantém DISTRIBOX (setup 01/06) fora do fechamento de junho — porque o início é em junho, não em maio — e traz Camila/Érico/Max Glam para o fechamento de junho.

## Mudanças

### `src/routes/resumo.tsx`

No `fechamentoData` (e no cálculo do `linhas` do histórico), trocar o filtro de `ativos`:

```ts
// antes
const ativos = clientesFiltrados.filter((c) => clienteFaturaEm(c, cy, cm, planos));

// depois — ativos no ciclo (independente de quando a 1ª cobrança ocorre)
const cicloInicio = new Date(cy, cm, 1);
const cicloFim = new Date(cy, cm + 1, 0);
const ativos = clientesFiltrados.filter((c) => {
  const ini = new Date(c.dataInicio);
  if (ini > cicloFim) return false;
  if (c.dataChurn) {
    const churn = new Date(c.dataChurn);
    if (churn < cicloInicio) return false;
  }
  return true;
});
```

Aplicar o mesmo critério na geração das `linhas` do histórico (mesma função `clienteFaturaEm` que decide quem entra no mês).

### Receita do cliente no ciclo

`receitaMensalClienteEm` hoje retorna 0 quando não há `vencimento` no mês. Para Camila/Érico, a 1ª cobrança é em 05/06 — porém o ciclo que estamos fechando é maio. Ajustar para:

- Se houver `obterVencimentoDaCompetencia(c, cy, cm, planos)` → usar normalmente.
- Caso contrário, se o cliente estiver ativo no ciclo (mesma regra acima), usar a **receita recorrente padrão** (`receitaMensalCliente` com snapshot do final do ciclo) para atribuir a cobrança que será emitida na próxima data de vencimento.

Isso garante que o KPI "Fechamento Mensal" some corretamente as mensalidades de Camila/Érico no fechamento de junho.

### Setups e churns

`setupsNoMes` e `churnsNoMes` já filtram por `dataInicio`/`dataChurn` dentro do ciclo — não precisam mudar. Camila e Érico vão aparecer também no card "Setups no mês" do fechamento de junho.

## Validação

Após a mudança, no fechamento de **junho/2026** devem aparecer na lista de clientes faturados:
- Camila Ahrens (setup 12/05)
- Érico Servano (setup 07/05)
- Max Glam (setup 08/05, churn 30/05 — encerramento)
- demais clientes ativos com cobrança recorrente em maio

E NÃO deve aparecer DISTRIBOX Central de Marcas (setup 01/06).
