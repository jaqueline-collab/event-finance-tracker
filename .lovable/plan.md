# Relatórios de fechamento fiéis ao que foi faturado + correção da DISTRIBOX

Nenhum fechamento gravado é alterado nem recalculado. A correção é só na leitura e na exibição dos relatórios, mais a gravação de detalhes nos próximos fechamentos.

## De onde cada PDF busca os dados hoje

Os dois PDFs são gerados na tela interna de Fechamento Mensal.

| PDF | Primeira página / tabela | Páginas de detalhe |
|---|---|---|
| Resumo do Faturamento | **Valor gravado** no fechamento (bruto, desconto, líquido por cliente) | **Cadastro atual** do cliente: o valor "/mês" do cabeçalho, o plano e a "Composição da mensalidade (hoje)" são recalculados com o que está cadastrado hoje |
| Fechamento Mensal · Competência X | **Recálculo ao vivo** da competência com o cadastro atual (acompanhamento atual, clientes filtrados pelas regras atuais) | O mesmo recálculo |

Por isso o acompanhamento aparece como R$ 200 (valor atual) em vez de R$ 250/R$ 600/R$ 0, e a Dra. Nathalia Morato fica fora da lista de faturados mesmo tendo sido cobrada. O PDF de resumo da Área do Parceiro já usa o valor gravado e não muda.

O que cada fechamento já guarda por cliente: valor bruto, desconto, líquido, plano, Sistema, Acompanhamento, MAU excedente e regra de troca de plano. **Não guarda** os itens (canais, usuários, módulos, quantidades e valores unitários).

## Correções

### 1. PDF "Resumo do Faturamento"
- O cabeçalho "/mês" de cada cliente passa a ser o líquido gravado, igual ao da tabela.
- O nome do plano vem do que foi gravado no fechamento.
- A seção passa a se chamar **"Composição da mensalidade no fechamento"**, nesta ordem de fonte:
  1. **Itens gravados** no fechamento (fechamentos novos).
  2. **Reconstrução pelas movimentações** até o fim do ciclo, aceita só se o total reconstruído bater com o Sistema gravado (diferença de até R$ 0,01).
  3. Caso contrário: só **Sistema, Acompanhamento, MAU excedente, Desconto e Total** gravados, com uma nota "Itens detalhados indisponíveis para este fechamento".
- Total da composição = valor da tabela, sempre. Nunca valores atuais.
- A linha do tempo de movimentos mostra só movimentos até o fim do ciclo.

### 2. PDF "Fechamento Mensal"
- Quando já existe fechamento gravado para a competência, o PDF lê os **fechamentos gravados** (mesma fonte da lista), respeitando os filtros de parceiro e plano: clientes, Sistema, Acompanhamento, Desconto e Total por cliente, e os totais do fechamento.
- Clientes setup no período e cobrados (caso da Dra. Nathalia) aparecem entre os faturados, porque estão no fechamento.
- Sem fechamento gravado (prévia antes de gerar), o PDF continua como prévia do cálculo atual, com o título marcado como "Prévia".

### 3. Daqui para frente
Ao gerar um fechamento, gravar também a composição completa de cada cliente: itens, quantidades, valores unitários, Sistema, Acompanhamento, MAU, desconto e total.

### 4. Movimento da DISTRIBOX (pendente da etapa anterior)
O movimento "WhatsApp +1" de 08/09/2026 também marcou de novo Agentes de IA, Z-API e Transcrição, que já estavam ativos. Por isso mostra +R$ 229,98 (R$ 29,99 do canal + R$ 199,99 da IA). Ajuste: limpar só essas três marcações **nesse movimento**, mantendo o canal. Os recursos continuam ativos no cliente. Resultado: **+R$ 29,99/mês**. Nenhum fechamento é alterado.

## Validação (critérios de aceite)
- Primeiro confirmar no banco os totais gravados: Rabbit Agency Agosto/2026 = 18 clientes e R$ 10.659,32; Setembro/2026 = R$ 10.829,19 líquido.
- Os dois PDFs e a tela mostram esses mesmos números.
- Conferir os casos citados: Instituto Murilo Fischer, Cirurgiões Staffs - Fischer, Camila Ahrens, Dra. Nathalia Morato, Chronos BH. Em todos, total do detalhe = valor da tabela.
- Gerar o mesmo PDF duas vezes, com o cadastro de um cliente alterado em memória entre as duas, e confirmar que dá os mesmos valores.
- DISTRIBOX: o movimento mostra +R$ 29,99/mês.
- Testes automáticos para a escolha da fonte da composição (gravada → reconstruída → só totais).

## Detalhes técnicos
- `src/routes/resumo.tsx`: `exportarAuditoriaPdf` usa `it.valorLiquido`, `snap.planoNome`, e uma nova função pura `composicaoDoFechamento(item, cliente, planos, movimentos)` em `src/lib/calc/composicao-fechamento.ts` (testável). Reconstrução: `explicarReceitaCliente(clienteSnapshotAt(cli, movs, cicloFim))` com o acompanhamento substituído pelo `snap.acompanhamento`, aceita só se `subtotalSistema ≈ snap.sistema`.
- `exportarFechamentoPdf`: quando `fechamentosVisiveis` tem fechamento(s) não excluídos na competência, monta as linhas de `fechamentoItensVisiveis` (filtradas por cliente do parceiro/plano), somando bruto/desconto/líquido; senão mantém o caminho atual com o título "Prévia".
- Geração: `payloadSnapshot.composicao = { itens, subtotalSistema, acompanhamento }` a partir de `explicarReceitaCliente` do snapshot do fim do ciclo. Só JSON novo; sem migração.
- DISTRIBOX: atualização de dados no movimento `06zybvyj` (`agentes_ia`, `zapi`, `transcricao_ia` → vazio), com conferência de cliente, data, tipo e `canais_whats = 1`.
- roadmap.md recebe as duas tarefas ao iniciar a execução.
