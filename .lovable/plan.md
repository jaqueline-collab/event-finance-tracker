# Investigação: fechamento retroativo com acompanhamento atual

Somente relatório. Nada foi alterado, gerado ou apagado.

## 1. De onde o valor sai hoje

O "Detalhamento por Cliente" monta cada linha com o **registro atual do cliente** e tenta voltar no tempo desfazendo as movimentações posteriores à data. Essa tentativa só desfaz:
- quantidades de upgrade/downgrade (canais, usuários, contatos, apps, MAU);
- churn.

Ela **não desfaz**:
- o **valor de acompanhamento** → sempre sai o valor atual do cliente (ex.: R$ 200 hoje, mesmo em Julho);
- o **plano do cliente** → uma troca de plano feita depois volta como se sempre tivesse existido. O valor do sistema passa a ser o do plano novo.
- o **preço do plano** → se o preço de um plano mudar, todas as competências em aberto passam a usar o preço novo. Não existe histórico de preços de plano.

A única exceção é a troca de plano feita *dentro* do ciclo que está sendo calculado (regra próximo ciclo/integral/proporcional). Nesse caso o plano antigo é considerado, mas o acompanhamento continua saindo o atual.

## 2. Existe histórico com data?

Existe um histórico parcial. Cada movimentação que ajusta o acompanhamento guarda **a data e o valor novo**, mas **não guarda o valor antigo**. No banco há 15 movimentações assim, todas "Alterar plano" de 19/09/2026, todas levando o acompanhamento para R$ 200 (Nathalia Morato, Ana Kappes, Gean Brustolin, Luiz Schwab, Camila Ahrens, INTEP's, Majestic, Estéfani, Alexandre Mansur, Tatiana Patruni, Jonas Lenzi, ZAYN, Isabela Zanini, Anna Karoline, Instituto Murilo Fischer). Não existe nenhuma movimentação do tipo "acompanhamento" isolado.

## 3. Dá para reconstruir?

Sim, em grande parte:
- **Depois de uma mudança:** o valor vigente é o da última movimentação com data menor ou igual ao fim do ciclo.
- **Antes da primeira mudança:** falta o valor antigo. Ele pode ser recuperado dos fechamentos já emitidos, que guardam o acompanhamento de cada cliente: R$ 250 para quase todos e R$ 600 para um deles, de Fevereiro a Agosto. Para cliente sem fechamento anterior, só dá para inferir. Nesse caso a tela precisaria pedir o valor.
- **O plano anterior** também pode ser reconstruído pelas movimentações e pelo plano gravado em cada fechamento. O **preço antigo de um plano** não pode ser reconstruído, porque não tem histórico.

## 4. Tamanho real do problema

Nenhum fechamento já gerado foi afetado. Todos foram gerados **antes** de 19/09, quando o acompanhamento ainda era R$ 250/R$ 600:
- 2026-02 a 2026-05: gerados em 28/07 e 02/08, com R$ 250 (e R$ 600 para um cliente);
- 2026-06: 11 itens gravados sem o campo de acompanhamento separado (formato antigo). O valor total está congelado.
- 2026-07: 2 itens, de clientes sem mudança de acompanhamento;
- 2026-08: gerado em 09/09, com R$ 250/R$ 600.

O risco é **só para fechamentos gerados daqui para frente** de competências até Setembro/2026 para esses 15 clientes. Julho, por exemplo, sairia com R$ 200 em vez de R$ 250. Para identificar casos futuros: item de fechamento com ciclo terminando antes de 19/09/2026, de um dos 15 clientes, com acompanhamento de R$ 200.

## 5. Congelamento confirmado

Sim. Cada fechamento gerado grava o valor do sistema, o acompanhamento, os totais e o plano no próprio registro, e a tela e o PDF leem esse valor gravado. Corrigir a lógica depois não muda nenhum fechamento antigo.

## Próximo passo sugerido (só com sua aprovação)

1. Ao montar um ciclo passado, usar o acompanhamento vigente naquela data: a última movimentação até o fim do ciclo ou, antes dela, o valor do último fechamento emitido do cliente.
2. Fazer o mesmo com o plano do cliente, voltando trocas de plano posteriores ao ciclo.
3. Passar a guardar o valor antigo nas próximas movimentações de acompanhamento/plano.
4. Mostrar um aviso no detalhamento quando o valor for inferido, e não lido do histórico.
5. Adicionar testes de competência retroativa.

## Detalhes técnicos

- Cálculo: `detalharCicloCliente` (`src/lib/calc/receita.ts`), chamado em `src/routes/resumo.tsx:736`, usa `clienteSnapshotAt` (`src/lib/calc/datas.ts:125`), que só reverte deltas de upgrade/downgrade e churn e ignora `planoId`/`valorAcompanhamento`/`alterar_plano`.
- `calcularPatchMovimento` (`src/lib/calc/movimento.ts`) aplica `valorAcompanhamento` explícito ou a herança do plano, sem gravar o valor anterior.
- Os fechamentos guardam `payload_snapshot.acompanhamento` e `sistema` em `elora_fechamento_itens`.
