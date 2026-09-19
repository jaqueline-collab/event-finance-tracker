# Confirmação do histórico + plano novo com preço reduzido

## Parte 1 — Resposta: o histórico está congelado

Verifiquei o código e o banco. A resposta tem duas partes, porque "MRR Sistema" e "fechamento mensal" são coisas diferentes:

**1. Fechamentos mensais já gerados: CONGELADOS.** Quando você gera um fechamento, o sistema grava os valores daquele momento em registros próprios e a tela passa a mostrar esses valores gravados — nunca recalcula a partir do plano. Mudar o preço do plano hoje não altera nenhum fechamento passado.

- Tabela `elora_fechamento_itens`, campos `valor_bruto`, `valor_desconto`, `valor_liquido`, `plano_id`, `vencimento`, `ciclo_inicio`, `ciclo_fim`.
- Além dos números, cada item guarda uma fotografia completa do cálculo em `payload_snapshot`: nome do cliente, nome do plano, valor de sistema, valor de acompanhamento, MAU do mês, MAU incluso, valor unitário do MAU, excedentes e descontos aplicados.
- Os totais da competência ficam em `elora_fechamentos` (`total_bruto`, `total_desconto`, `total_liquido`) e as cobranças em `elora_financeiro` (`valor`, `competencia`, `vencimento`).
- A tela de Resumo lê exatamente esses campos gravados ao exibir e ao exportar o PDF de um fechamento passado.

**2. "MRR Sistema" no cadastro do cliente: calculado ao vivo.** Esse indicador (e os cards de MRR do Dashboard e da lista de clientes) reflete sempre a situação atual: preço atual do plano × configuração atual do cliente. Ele é uma leitura do presente, não um valor histórico. Se o cliente for migrado para um plano mais barato, o MRR dele passa a mostrar o valor novo — o que é o comportamento correto — mas os fechamentos já emitidos continuam com os valores antigos.

Conclusão prática: você pode criar o plano novo e migrar clientes manualmente sem risco algum para o histórico financeiro. O único ponto de atenção é que competências ainda **não fechadas** são calculadas ao vivo — então migrar um cliente no meio de um ciclo muda o valor daquele ciclo ainda não gerado.

## Parte 2 — Plano novo, sem tocar no atual

O plano atual é **Essencial Rabbit Agency** (24 clientes vinculados, mensalidade R$ 199,99, ciclo do dia 5 ao dia 4, vencimento dia 5). Ele não será editado em nada.

O que será feito:

1. **Cópia pronta para cadastro** — criar um plano novo com todos os recursos, franquias, custos e preços idênticos ao Essencial Rabbit Agency, com nome provisório "Essencial Rabbit Agency (cópia)". Você renomeia e ajusta os valores reduzidos (acompanhamento, ciclo de faturamento e os custos dos recursos) direto na tela de Planos.
2. **Botão "Duplicar" na tela de Planos** — cada plano da lista ganha uma ação de duplicar, que abre o formulário já preenchido com todos os valores do plano de origem e nome sufixado com "(cópia)"; ao salvar, nasce um plano novo, sem clientes.
3. **Nenhuma migração** — nenhum cliente é associado ao plano novo. A troca de plano continua sendo feita cliente a cliente, por você, no cadastro.

## Parte 3 — Troca de plano: quando entra em vigor e como cobrar

Ao trocar o plano de um cliente no cadastro, antes de salvar aparece:

**"Quando a mudança de plano entra em vigor?"**
- **Próximo ciclo** — nada muda no ciclo em andamento; o plano novo passa a valer no fechamento seguinte. Sem pergunta extra.
- **Este ciclo** — abre a segunda pergunta.

**"Como cobrar neste ciclo?"**
- **Valor integral do plano novo** — o ciclo inteiro é calculado com o preço novo, mesmo que parte do período tenha rodado no plano antigo.
- **Proporcional** — rateio por dias corridos dentro do ciclo: do primeiro dia do ciclo até a data da troca no preço antigo, da data da troca até o fim do ciclo no preço novo, e a soma dos dois vira o valor do ciclo.

Confirmação do cálculo proporcional (é assim que será feito): cada trecho vale `valor do plano × (dias do trecho ÷ dias totais do ciclo)`, contando dias corridos, com o dia da troca já no plano novo e o último dia do ciclo incluído.

**Registro no fechamento:** quando o fechamento desse ciclo for gerado, o `payload_snapshot` do item passa a guardar a regra usada (`proximo_ciclo`, `integral` ou `proporcional`), o plano antigo e o novo, a data da troca, os dias de cada trecho e os dois valores parciais — dá para reler um fechamento antigo e entender o número sem lembrar a regra.

**Nada retroage:** fechamentos já gerados continuam intocados, e a escolha vale só para o ciclo da troca.

## Validação

- Conferir que Essencial Rabbit Agency segue com os mesmos valores e os mesmos 24 clientes.
- Conferir que o plano novo aparece na lista de planos e no seletor de plano do cadastro de cliente, com 0 clientes.
- Conferir que um fechamento passado exibe exatamente o mesmo valor de antes.
- Troca com "Próximo ciclo": o fechamento do ciclo atual usa o plano antigo, sem mudança.
- Troca com "Este ciclo" + "Valor integral": o ciclo inteiro sai no preço novo.
- Troca com "Este ciclo" + "Proporcional": o valor bate com a conta manual de dias corridos.
- O detalhe do fechamento mostra a regra usada e os valores parciais quando proporcional.

## Detalhes técnicos

- Congelamento: `elora_fechamento_itens.valor_bruto/valor_desconto/valor_liquido/payload_snapshot` gravados por `gerarFechamentoCompleto` (`src/lib/fechamentos.functions.ts`), exibidos em `src/routes/resumo.tsx` sem recálculo.
- Cálculo ao vivo: `receitaMensalCliente` / `receitaSistemaCliente` em `src/lib/calc/receita.ts`, usados por `clientes.tsx` e `dashboard.tsx`.
- Duplicação: nova ação em `src/routes/planos.tsx` reaproveitando o formulário existente e a mutação `plan-create` de `src/lib/mutations.functions.ts` — novo `id`, `parceiroIds` copiados, nenhum cliente alterado.
- Troca de plano: migração aditiva em `elora_movimentos` com duas colunas opcionais (`vigencia_plano` = `este_ciclo` | `proximo_ciclo`, `cobranca_troca` = `integral` | `proporcional`), sem default destrutivo; movimentos antigos sem valor seguem o comportamento atual.
- O diálogo de troca vive no cadastro de cliente (`src/routes/clientes.tsx`), gravando a escolha junto do movimento de upgrade/downgrade (`src/lib/movimentos.schemas.ts` + `movimentos.functions.ts`).
- Cálculo: nova função em `src/lib/calc/receita.ts` que, ao montar o ciclo, consulta o movimento de troca do período — `proximo_ciclo` snapshota o cliente com o plano antigo; `integral` snapshota com o plano novo; `proporcional` soma os dois trechos por dias corridos usando `getCicloCliente` (`src/lib/calc/ciclo.ts`), sem alterar o comportamento de quem não tem troca no ciclo.
- Snapshot: campos novos no `payloadSnapshot` montado em `src/routes/resumo.tsx` (`regraTroca`, `planoAnteriorNome`, `planoNovoNome`, `dataTroca`, `diasAntes`, `diasDepois`, `valorTrechoAntigo`, `valorTrechoNovo`), exibidos no detalhe do fechamento.
- Nenhuma alteração em dados financeiros existentes e nenhuma migração de cliente entre planos.

