## Ajustes confirmados

### A. Correções pontuais de dados
1. **Plano Rabbit** (`rwq5rggn`) → ciclo `5 → 4`. Outros planos seguem `1 → 31`.
2. **Dr Alexandre Mansur** → `valor_acompanhamento` 246 → **250**.
3. **Érico Servano** → **CHURN em 24/06/2026** (novo movimento `tipo='churn'` em `elora_movimentos` + `UPDATE elora_clientes SET data_churn='2026-06-24'`). Não é upgrade.
4. Cecilia Bunn → você cadastra manualmente.

### B. Fechamento por ciclo do cliente (não mais por mês global)

- Cada cliente entra no fechamento da competência X **apenas quando o ciclo dele para essa competência já terminou** (`getCicloCliente(...).fim < hoje`).
- Hoje (30/06/2026):
  - **Distribox** (1→31): Junho/26 fecha em 30/06 → já elegível.
  - **Rabbit** (5→4): Junho/26 termina em 04/07 → só elegível a partir de 05/07.
- O seletor "Gerar Fechamento" passa a oferecer toda competência com ≥ 1 cliente elegível; os não-elegíveis ficam de fora dessa rodada (entram na próxima quando o ciclo fechar).

### C. Filtros do Resumo Mensal

Três filtros combináveis, KPIs e tabela respeitam todos:
- **Competência** (mês/ano)
- **Vencimento** (dia do mês)
- **Plano**

### D. Mudanças técnicas

- `src/routes/resumo.tsx`:
  - Substituir `opcoesFechamento` global por `clienteElegivelParaFechamento(cliente, y, m, hoje)` usando `getCicloCliente(...).fim < hoje`.
  - Listar no seletor competências que tenham ≥ 1 cliente elegível.
  - Filtrar a geração de fechamento aos elegíveis; mostrar badge "X de Y clientes (Z aguardando fim do ciclo)".
- `src/lib/calc/ciclo.ts` e `receita.ts` permanecem como estão (wrap-around 5→4 já suportado).

Sem mudanças de schema. Sem mexer em Dashboard / Financeiro / Clientes / Planos.
