## Objetivo

Resolver as 3 oportunidades de alta prioridade sem quebrar nada em produção. Estratégia: **re-exports em ponte** para manter todos os imports atuais funcionando enquanto o código real migra.

---

## 1. Quebrar `src/lib/store.ts` (1.165 linhas)

Criar novos arquivos com as funções puras e deixar `store.ts` apenas com o Zustand + re-exports para retro-compatibilidade.

```text
src/lib/
├── mappers.ts            # mapPlanoToDb, mapDbToPlano, mapClienteToDb, etc.
├── calc/
│   ├── datas.ts          # parseDiaVencimento, normalizarDataVencimento,
│   │                     #   obterVencimentoDaCompetencia, clienteAtivoEm,
│   │                     #   clienteSnapshotAt, getDiaVencimentoEfetivo,
│   │                     #   formatDiaVencimento
│   ├── helena.ts         # calcularCustoExtraCanaisHelena,
│   │                     #   calcularCustoExtraUsuariosHelena,
│   │                     #   calcularCustoExtraContatosHelena,
│   │                     #   calcularCustoBrutoHelena,
│   │                     #   calcularDescontoEscalaHelena,
│   │                     #   calcularCustoLiquidoHelena
│   ├── receita.ts        # receitaMensalCliente, receitaMensalClienteEm,
│   │                     #   receitaCicloCliente (NOVA – ver item 3),
│   │                     #   receitaSistemaCliente, receitaSistemaTotal,
│   │                     #   receitaMensalTotal, faturamentoAcumuladoCliente
│   ├── custo.ts          # custoMensalCliente
│   └── format.ts         # formatBRL
└── store.ts              # Zustand store + `export * from './calc/...'`
                          #   (mantém 100% dos imports atuais funcionando)
```

**Por que re-exports?** Os arquivos `resumo.tsx`, `clientes.tsx`, `financeiro.tsx`, `planos.tsx`, `parceiros.tsx` importam ~20 funções de `@/lib/store`. Reescrever todos os imports é trabalho mecânico de baixo valor e alto risco. O `export *` no `store.ts` resolve.

---

## 2. Extrair subcomponentes (resumo.tsx e clientes.tsx)

Foco em blocos que são **dialogs/seções autocontidas** — extração de baixo risco, alto ganho.

**`src/routes/resumo.tsx` (1.091 linhas)** → extrair para `src/components/resumo/`:
- `FechamentoDialog.tsx` — todo o Dialog de fechamento mensal (≈ 350 linhas), recebe `{ open, onOpenChange, mes, clientesFiltrados, ... }`.
- `HistoricoMensalTable.tsx` — tabela principal de linhas mês a mês (≈ 200 linhas).
- `DetalhesMesDialog.tsx` — dialog expandido com clientes do mês.

**`src/routes/clientes.tsx` (1.275 linhas)** → extrair para `src/components/clientes/`:
- `ClienteFormDialog.tsx` — formulário de criar/editar cliente.
- `HistoricoClienteDialog.tsx` — timeline de movimentos.
- `MovimentoForm.tsx` — formulário de upgrade/downgrade/serviço.

Cada extração é uma rodada de "copia o JSX + props + handlers, importa de volta". State de filtros/seleção continua na rota pai.

---

## 3. Unificar histórico mensal com lógica de ciclo

A função `receitaCicloCliente` hoje vive **inline em `resumo.tsx`** (linha 90) e usa snapshot no último dia do ciclo. Mas a coluna "Receita/mês" do PDF (linha 211) e do dialog de detalhes (linha 773) ainda chamam `receitaMensalClienteEm`, que snapshota no vencimento (dia 5) — **mesmo bug que originou esta thread**.

Mudanças:
1. Promover `receitaCicloCliente` para `src/lib/calc/receita.ts` como função exportada (assinatura: `receitaCicloCliente(c, planos, custos, movimentos, y, m)`).
2. Substituir as duas chamadas a `receitaMensalClienteEm` em `resumo.tsx` por `receitaCicloCliente`.
3. Remover a definição local em `resumo.tsx` e passar a importar.
4. **`financeiro.tsx` (linha 105)** também usa `receitaMensalClienteEm` para somar receita do mês — trocar por `receitaCicloCliente` para ficar consistente com o fechamento.
5. Manter `receitaMensalClienteEm` exportada (uso interno em `faturamentoAcumuladoCliente`, retrocompat).

---

## Ordem de execução (incremental, verificável)

1. **Issue 3** primeiro — pequeno e bate na regra de negócio do bug original.
2. **Issue 1** — criar arquivos `calc/*` movendo as funções, deixar `store.ts` re-exportando.
3. **Issue 2** — extrair os 3 componentes mais autocontidos de cada rota.

Validação após cada passo: `bun run build` (rodado automaticamente pelo harness).

---

## O que NÃO entra nesta rodada

- Testes unitários (item 9 da revisão) — mereceria PR próprio.
- Migração para `createServerFn`/`ensureQueryData` (item 4) — mudança arquitetural.
- Tipagem (`as any`), logger central, refresh de sessão — itens médios.
