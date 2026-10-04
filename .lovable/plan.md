# Relatórios de fechamento fiéis ao que foi faturado

Nenhum fechamento gravado é alterado nem recalculado. A correção é só na leitura e exibição dos dois PDFs da tela de Fechamento Mensal, mais a gravação de detalhes nos próximos fechamentos.

## Contexto do bug

Os dois PDFs hoje misturam fontes: a tabela-resumo usa valores gravados, mas o cabeçalho "/mês", o nome do plano e a "Composição da mensalidade (hoje)" de cada cliente são recalculados com `explicarReceitaCliente(cli, planos)` usando o cadastro ATUAL do cliente, não o que foi faturado. Por isso o Acompanhamento aparece com o valor de hoje (ex. R$ 200) em vez do valor histórico, e clientes que já tiveram o plano trocado mostram o plano errado. O PDF "Fechamento Mensal · Competência X" tem o mesmo problema: recalcula tudo ao vivo em vez de ler o fechamento gravado quando ele existe.

## 1. Nova função pura: `src/lib/calc/composicao-fechamento.ts`

Criar `composicaoDoFechamento(item: FechamentoItem, cliente: Cliente | undefined, planos: Plano[], movimentos: Movimento[])`, retornando:

```ts
type FonteComposicao = "gravada" | "reconstruida" | "so_totais";

interface ComposicaoFechamento {
  fonte: FonteComposicao;
  planoNome: string | null;
  itens: ExplicacaoReceita["itens"]; // vazio quando fonte = "so_totais"
  subtotalSistema: number;
  acompanhamento: number;
  mauExcedenteValor: number;
  desconto: number;
  total: number;
  aviso?: string; // preenchido só quando fonte = "so_totais"
}
```

Lógica, nesta ordem:
1. **Gravada**: se `item.payloadSnapshot.composicao` existir (ver seção 3), usa direto. `fonte = "gravada"`.
2. **Reconstruída**: senão, se houver `cliente` e `item.cicloFim`, chama `explicarReceitaCliente(clienteSnapshotAt(cliente, movimentos, item.cicloFim), planos)`, substitui `acompanhamento` pelo `snap.acompanhamento` do `payloadSnapshot` (campo já existente), e só aceita o resultado se `Math.abs(subtotalSistema - snap.sistema) <= 0.01`. Se aceitar, `fonte = "reconstruida"`.
3. **Só totais**: senão, monta o objeto só com `sistema`, `acompanhamento`, `mauExcedenteValor`, `desconto` e `total` vindos do `payloadSnapshot`/`item`, `itens = []`, `fonte = "so_totais"`, `aviso = "Itens detalhados indisponíveis para este fechamento."`.

Em todos os casos, **`total` é sempre `item.valorLiquido` gravado** — a função nunca retorna um total diferente do que já está na tabela.

Escrever testes unitários cobrindo os 3 casos (gravada / reconstruída aceita / reconstruída rejeitada cai para só-totais), em `src/lib/calc/__tests__/composicao-fechamento.test.ts`.

## 2. `exportarAuditoriaPdf` (PDF "Resumo do Faturamento") — `src/routes/resumo.tsx` linha ~2685

Na tabela-resumo (`resumoBody`), trocar a coluna "Plano":
```ts
// antes: planos.find((p) => p.id === cli!.planoId)
// depois: usar o nome gravado no snapshot
const snap = (it.payloadSnapshot ?? {}) as Record<string, any>;
const planoNomeGravado = snap.planoNome ?? planos.find((p) => p.id === cli!.planoId)?.nome ?? "—";
```

Nas páginas de detalhe por cliente, trocar toda a chamada a `explicarReceitaCliente(cli, planos)` por `composicaoDoFechamento(it, cli, planos, movimentos)`:
- Cabeçalho "/mês" de cada cliente passa a mostrar `it.valorLiquido` (igual à tabela), nunca um valor recalculado.
- Nome do plano vem de `composicao.planoNome`.
- A seção troca de nome para **"Composição da mensalidade no fechamento"**.
- Quando `composicao.fonte === "so_totais"`, mostrar só Sistema/Acompanhamento/MAU excedente/Desconto/Total, com a nota `composicao.aviso` visível no PDF.
- A linha do tempo de movimentos (`deltaMovto`) deve filtrar só movimentos com `data <= item.cicloFim` (hoje mostra todos os movimentos do cliente, inclusive os posteriores ao fechamento).

## 3. `exportarFechamentoPdf` (PDF "Fechamento Mensal · Competência X") — linha ~1086

Antes de montar as linhas por recálculo ao vivo, checar se existe fechamento gravado para a competência:
```ts
const fechamentosDaCompetencia = fechamentosVisiveis.filter((f) => f.competencia === competenciaKey);
```
- **Se houver** (um ou mais, não excluídos): montar as linhas a partir de `fechamentoItensVisiveis` (filtradas pelo(s) `fechamento.id` da competência, respeitando os filtros de parceiro/plano já existentes na tela), somando bruto/desconto/líquido desses itens. Isso inclui automaticamente clientes que foram cobrados mesmo que hoje não se qualifiquem mais pelas regras atuais (caso Dra. Nathalia Morato).
- **Se não houver**: manter o caminho atual (recálculo ao vivo), com o título do PDF marcado como "Prévia" (já deve haver uma variável de título — só garantir que o rótulo "Prévia" apareça quando não há fechamento gravado).

## 4. Gravação: incluir composição completa nos próximos fechamentos

Em `enviarParaFinanceiro` (linha ~1326), dentro do `payloadSnapshot` de cada item, adicionar:
```ts
payloadSnapshot: {
  ...,
  composicao: {
    itens: expD.itens,            // de explicarReceitaCliente(d.cliente, planos) já calculado nesse fluxo
    subtotalSistema: expD.subtotalSistema,
    acompanhamento: d.acomp,
  },
},
```
Isso não precisa de migração — `payload_snapshot` em `elora_fechamento_itens` já é JSON livre (`z.unknown().optional()` em `fechamentoItemRowSchema`).

## Critérios de aceite
- Gerar o mesmo PDF duas vezes, alterando o cadastro de um cliente em memória entre as duas gerações: os dois PDFs devem sair idênticos.
- Conferir que os totais batem com o gravado: Rabbit Agency Agosto/2026 = 18 clientes, R$ 10.659,32; Setembro/2026 = R$ 10.829,19 líquido.
- Conferir os clientes: Instituto Murilo Fischer, Cirurgiões Staffs - Fischer, Camila Ahrens, Dra. Nathalia Morato, Chronos BH — em todos, total do detalhe = valor da tabela, e a Dra. Nathalia aparece na lista de faturados quando há fechamento gravado no período.
- Testes automáticos passando para os 3 casos de `composicaoDoFechamento`.
- `roadmap.md`: marcar como concluída a tarefa "Relatórios de fechamento fiéis ao que foi faturado" ao final.

## Restrição
Nenhum fechamento, item ou lançamento já gravado no banco é alterado, recalculado ou regravado por esta mudança. É só leitura/exibição + gravação de um campo novo (`composicao`) nos próximos fechamentos.