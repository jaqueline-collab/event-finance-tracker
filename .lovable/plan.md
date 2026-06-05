## Diagnóstico

No "Fechamento Mensal" de **junho/2026** (que fecha o ciclo de **maio**), a receita da Zayn aparece igual à de maio mesmo tendo havido um upgrade em **11/05/2026**.

Causa confirmada no banco:
- Zayn: `data_vencimento = 05/03/2026` (dia 5), upgrade em `11/05/2026`.
- Fluxo atual em `src/routes/resumo.tsx → receitaCicloCliente(c, cy=2026, cm=4)`:
  1. Chama `obterVencimentoDaCompetencia(c, 2026, 4)` → retorna **05/05/2026** (vencimento de maio).
  2. Chama `receitaMensalClienteEm`, que internamente faz `clienteSnapshotAt(c, movimentos, "2026-05-05")`.
  3. `clienteSnapshotAt` **reverte** todo movimento com `data > "2026-05-05"`. O upgrade de **11/05** é posterior → é revertido.
  4. Resultado: snapshot ignora o upgrade e a receita do fechamento sai igual à de maio.

Conceitualmente, o fechamento de junho representa o que será faturado na cobrança de junho (05/06), e essa cobrança já incorpora todas as alterações feitas durante o ciclo de maio. A data de snapshot precisa ser o **fim do ciclo fechado**, não o vencimento do início do ciclo.

## Correção

### `src/routes/resumo.tsx`

Reescrever `receitaCicloCliente` para sempre tirar o snapshot no **último dia do ciclo** (capturando upgrades/downgrades feitos durante o mês), em vez de delegar para `receitaMensalClienteEm` (que snapshotaria no vencimento do início do ciclo).

```ts
const receitaCicloCliente = (c, y, m) => {
  // Cliente precisa ter estado ativo em algum dia do ciclo
  if (!clienteAtivoNoCiclo(c, y, m)) return 0;
  const fimCiclo = new Date(y, m + 1, 0);
  const snap = clienteSnapshotAt(c, movimentos, fimCiclo.toISOString().slice(0, 10));
  return receitaMensalCliente(snap, planos, custos);
};
```

Com isso, no fechamento de junho a snapshot da Zayn é tirada em 31/05/2026, o upgrade de 11/05 permanece aplicado, e a receita reflete o novo plano.

### Validação

- Zayn no fechamento de junho/2026 deve mostrar receita maior que em maio, refletindo o upgrade de 11/05.
- DISTRIBOX (setup 01/06) continua fora do fechamento de junho.
- Camila/Érico/Max Glam continuam aparecendo no fechamento de junho.
- A coluna "Receita" do histórico mensal (linhas 213 e 775) continua usando `receitaMensalClienteEm` para casos onde se quer especificamente "o que foi cobrado naquele vencimento"; avaliar se também deve ser trocado para consistência — proposta: trocar para `receitaCicloCliente` aplicado ao mês da linha, de modo que o histórico bata com o fechamento.

### Observação

`receitaMensalClienteEm` em `src/lib/store.ts` continua existindo e pode seguir sendo usada por outros consumidores que de fato querem "snapshot no vencimento". Não vamos alterá-la nesta correção.
