## 1. Nome do boleto no envio ao Financeiro

No card **"Enviar para o Financeiro"** (Resumo Mensal), adicionar um campo de texto **"Nome do boleto / descrição"** logo acima do botão Enviar.

Comportamento:
- **Modo consolidado**: 1 campo único. Default sugerido: `Fechamento {labelMes} · ciclo {cicloLabel}`. Esse texto vira a `descricao` do lançamento no módulo Financeiro.
- **Modo por cliente**: alterna para uma mini-tabela editável (1 linha por cliente selecionado) com coluna "Nome do boleto", pré-preenchida com `nome_financeiro || nome` do cliente. Cada linha vira a `descricao` do respectivo lançamento.
- Botão "Restaurar padrão" para regenerar os defaults.
- O valor digitado é exatamente o que aparece em **Financeiro → Descrição** (sem sufixos automáticos).

## 2. Correção do Status "Churn" exibido no mês errado

**Bug identificado**: Dra. Vania Almeida tem churn em **06/03/2026**, mas aparece com badge "Churn" já no fechamento de **fevereiro/2026**, porque o código (linha 1019 de `src/routes/resumo.tsx`) usa apenas a presença de `c.dataChurn` — ignora a competência em que está sendo exibido.

Mesmo problema afeta a **contagem de churns** por linha (linhas 229-233): hoje conta churn pelo mês calendário da `dataChurn`, mas a competência exibida segue o **ciclo de faturamento** do cliente (que pode cruzar meses). Vânia churnou 06/03 → deve contar como churn na competência cujo **ciclo contém** 06/03 (ou seja, fevereiro, se o ciclo dela for 18→17; ou março, se for mês calendário). Hoje conta sempre em março, independente do ciclo real.

**Correção**:
- **Badge Status**: usar `dataChurn` apenas quando `dataChurn ≤ ciclo.fim` daquela competência. Para competências anteriores ao churn → "Ativo".
- **Contagem de churns** por linha: alinhar com o ciclo real do cliente (`getCicloCliente`), considerando churn o cliente cujo `dataChurn` caia dentro do ciclo daquela competência.
- Auditar `clienteAtivoNoCiclo` (linhas 165-175) — já parece correto, mas validar que clientes churned continuam aparecendo no último ciclo faturado e somem nos seguintes.

## 3. Validação geral

Após as correções, rodar uma query de auditoria sobre todos os clientes com `data_churn` definida para confirmar que o resumo mensal só os marca como Churn na competência cujo ciclo contém a data, e ativos antes disso.

### Detalhes técnicos

- Arquivos afetados: `src/routes/resumo.tsx` (UI do envio, badge, contagem) e potencialmente `src/lib/calc/datas.ts` (helper `churnNoCiclo(cliente, y, m, plano)`).
- O campo nome do boleto vive em estado local; quando o usuário envia, o valor sobrescreve a `descricao` em `addLancamento(...)` (linhas 829 e 846).
- Não há mudança de schema no banco.