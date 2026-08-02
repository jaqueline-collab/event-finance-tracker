# Fechamento Mensal — MAU no fluxo principal, sem gráfico no PDF, ordem dos campos

## 1. MAU por cliente direto na tela de Gerar Fechamento

Hoje o MAU só existe **depois** que o fechamento foi gerado, no `MauFechamentoEditor` dentro do modal de auditoria (`resumo.tsx:2873`), que grava via `atualizarMauFechamentoItem` na store. A regra de cálculo já está definida ali e será reaproveitada sem alteração:

```text
excedente = max(0, MAU informado - plano.contatosInclusos)
acréscimo = excedente × plano.valorContatosExc   (fallback: valorCanaisExc, senão 0,10)
```

O que muda:

- Novo estado local `mauPorCliente: Record<clienteId, number>` no modal de fechamento, resetado quando a competência muda.
- Na tabela de clientes selecionáveis do modal, cada linha ganha uma coluna **MAU do mês** (input numérico) e uma coluna **Excedente** mostrando `qtd × unitário = +R$ X`, ou "dentro do plano".
- Bloco-resumo acima da tabela: total de MAU excedente do fechamento (soma dos acréscimos).
- O acréscimo entra na composição em `fechamentoSelecionado`: `subtotal` do cliente passa a ser `subtotal + mauExcedenteValor`, propagando naturalmente para desconto por cliente, `totalReceita`, ticket médio, KPIs, PDF e para os lançamentos do Financeiro.
- No snapshot gravado (`payloadSnapshot`) vão os mesmos campos que o editor pós-fechamento usa — `mauMes`, `mauExcedenteQtd`, `mauExcedenteValor`, `mauUnit`, `mauInclusos` — para que o editor de auditoria continue coerente e não duplique o valor.
- O `MauFechamentoEditor` do modal de auditoria permanece como está (edição posterior).

## 2. Remover o gráfico de receita (PDF e tela)

- Remove o estado `incluirGraficos` e o checkbox "Incluir gráficos no PDF" da tela (`resumo.tsx:1884`).
- Remove o bloco de desenho do gráfico de receita no PDF (`resumo.tsx:1186` em diante). O PDF passa a ter só tabelas e observações.
- Remove também o gráfico de área exibido **na tela** do modal de Gerar Fechamento, junto com os imports/dados que só existiam para alimentá-lo.

## 3. Nova ordem da tela (modal Gerar Fechamento)

```text
Cabeçalho: competência + resumo   [Limpar tudo] [Gerar relatório (PDF)]
--------------------------------------------------------------
1. KPIs do fechamento (clientes, setups, churns, total)
2. Métricas secundárias (LTV, ticket, sistema, acompanhamento)
3. Clientes do ciclo  ->  seleção + MAU do mês + excedente   (NOVO)
4. Descontos aplicados
5. Modo de envio (consolidado / por cliente) + nome do boleto
6. Enviar por e-mail
7. Observação (impressa no final do PDF)                     (movido p/ baixo)
--------------------------------------------------------------
                                     [ Gerar Fechamento ]  (rodapé, fim de tudo)
```

- A seção "Enviar para o Financeiro", hoje no meio da tela, deixa de ter botão próprio: o disparo passa a ser o botão único **Gerar Fechamento** no rodapé, depois da Observação.
- O botão mantém a validação com toast e o estado de "Gerando..." com spinner.

## Escopo protegido

Nada é gerado nem alterado: fechamentos de fevereiro a junho ficam intactos, e `elora_clientes`, `elora_movimentos`, `elora_planos`, `elora_parceiros`, `elora_descontos` e `elora_custos_wts` não são tocados. Sem migração de banco.

## Validação antes de concluir

Teste numérico com exemplo real (só leitura do plano, sem gravar): informo um MAU acima da franquia de um cliente do ciclo e confiro na tela que `excedente × unitário` bate com o cálculo manual e que o total do fechamento sobe exatamente esse valor. Mostro o resultado antes de você dar por concluído.

## Detalhes técnicos

Arquivo tocado: `src/routes/resumo.tsx` (estado de MAU, coluna na tabela, composição em `fechamentoSelecionado`, snapshot em `enviarParaFinanceiro`, remoção do gráfico no `exportarFechamentoPdf`, reordenação do JSX do modal). Sem mudanças em `store.ts` nem no banco.
