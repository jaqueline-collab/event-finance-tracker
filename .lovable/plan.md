
## 1. MAU excedente por conta dentro do fechamento

No painel de auditoria/edição de cada fechamento (modal "Detalhar fechamento", `src/routes/resumo.tsx`), adicionar por linha de cliente:

- Um input **"MAU do mês"** ao lado da coluna do valor bruto.
- Cálculo automático: `excedenteMAU = max(0, MAU digitado − plano.contatosInclusos)`; `acréscimo = excedenteMAU × plano.valorContatosExc` (fallback `0,10`).
- Exibição inline: `"120 excedentes × R$ 0,10 = +R$ 12,00"`.
- Ao salvar (botão **"Aplicar MAU"** por linha ou **"Salvar MAU do fechamento"** global):
  - Persiste no `payloadSnapshot` do `elora_fechamento_itens` (chave `mauMes` e `mauExcedenteValor`) — sem migração, campo já é JSON livre.
  - Atualiza `valorBruto` e `valorLiquido` do item somando o acréscimo (guardando `mauExcedenteValor` para permitir recálculo idempotente).
  - Recalcula os totais do fechamento (`totalBruto`, `totalLiquido`).
  - Se o item já foi enviado ao Financeiro (`lancamentoFinanceiroId`), também atualiza o `valor` do lançamento correspondente em `elora_financeiro` e recria a linha "MAU excedente (X)" na descrição.
- Novo método no store: `atualizarMauFechamentoItem(itemId, mauMes)` encapsulando toda a rotina.

## 2. Remover botão "Novo fechamento" por linha

Na tabela "Fechamentos" (competência → linhas de mês), remover a coluna/botão "Novo fechamento" de cada linha. Manter apenas o botão azul **"Gerar Fechamento"** no topo (`src/routes/resumo.tsx` linha ~1272). O fluxo passa a ser: usuário clica em "Gerar Fechamento" no topo → escolhe a competência no modal.

Ajuste do `colSpan` da linha de detalhe expandida (de 7 → 6).

## 3. Atalho "Detalhar hoje" no módulo de Clientes

No topo da página `src/routes/clientes.tsx` (ao lado do título "Clientes"), adicionar botão **"Detalhamento de hoje"**:

- Abre um modal grande listando **todos os clientes ativos** (não churnados na data de hoje) com o mesmo layout do modal individual "Detalhes" já existente (bloco "Estado atual" + resumo financeiro).
- Filtro implícito: `dataInicio ≤ hoje` e (`dataChurn` vazio ou `> hoje`).
- Botão "Exportar PDF" no modal, reutilizando o gerador de PDF do detalhamento individual (loop sobre a lista).
- Sem persistência: é um snapshot em tempo real.

## 4. Análise: por que "Lucro sob o sistema" fica negativo

Cálculo atual em `src/routes/clientes.tsx:879-880`:

```
receitaSist = receitaMensalCliente − valorAcompanhamento
lucroSistema = receitaSist − custoMensalCliente
```

Três causas concorrem:

1. **Licença base cobrada mesmo em planos baratos.** `custoMensalCliente` sempre soma `plano.licencaBase` (default R$ 149,90). Se o `valorMensal` do plano for ≤ R$ 149,90 (ex.: Rabbit Essencial) e o cliente não tiver excedentes, o custo já supera a receita bruta — e a receita "de sistema" (sem acompanhamento) fica ainda menor.
2. **Acompanhamento removido da receita, mas não do custo.** Clientes cujo faturamento é composto majoritariamente por `valorAcompanhamento` (serviço, não sistema) aparecem com "receita de sistema" pequena, enquanto o custo continua cheio.
3. **Custo per-client não recebe o desconto de escala Helena.** `custoMensalCliente` cobra excedentes de canais/usuários/contatos à tarifa cheia do plano; o desconto de escala (`calcularDescontoEscalaHelena`) só é aplicado no agregado da carteira. Por isso, clientes individuais com muitos excedentes parecem "no vermelho" mesmo quando, no consolidado, dão lucro.

**Recomendação (não incluído nesta plano, apenas diagnóstico):**
- Exibir um tooltip na coluna explicando "não inclui desconto de escala aplicado no consolidado".
- Opcional: ratear o desconto Helena proporcionalmente por cliente para uma visão mais realista.

Se quiser, na próxima iteração eu já aplico o rateio do desconto de escala nessa coluna.

## Arquivos alterados

- `src/routes/resumo.tsx` — remoção do botão por linha, MAU por item no modal de auditoria, recálculo de totais.
- `src/lib/store.ts` — novo `atualizarMauFechamentoItem` (e sincronização com `elora_financeiro` quando aplicável).
- `src/routes/clientes.tsx` — botão e modal "Detalhamento de hoje".
