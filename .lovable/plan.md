# Seleção em massa, acompanhamento no impacto e filtro "Sem parceiro"

## 1. Seleção em massa na lista de Clientes

- Nova coluna de marcação no início da tabela de Clientes, com uma caixa em cada linha e uma no cabeçalho para marcar/desmarcar todos os clientes exibidos no momento.
- A seleção acompanha os filtros e a pesquisa: ao mudar um filtro, ficam marcados apenas os clientes que continuam visíveis.
- Com um ou mais marcados, aparece uma barra de ações fixa acima da tabela: "N clientes selecionados", botão "Trocar plano" e "Limpar seleção".
- "Trocar plano" abre o mesmo diálogo já existente (Tipo de Ação, Data da Ação, Novo Plano, Quando entra em vigor, Como cobrar neste ciclo), agora no modo lote: uma escolha só, aplicada a todos.
- No modo lote, "Impacto na mensalidade" deixa de ser um número único e vira uma lista por cliente (nome, valor atual, valor após, diferença), com um total no rodapé da lista.
- Ao confirmar, pergunta "Confirmar troca de plano para N clientes?" antes de aplicar.
- Cada cliente recebe o seu próprio registro de movimento e o seu próprio cálculo, exatamente como se a troca tivesse sido feita uma por uma. Ao final, um aviso informa quantos foram gravados e, se algum falhar, quais falharam — os demais permanecem gravados.
- Nesse modo os campos de recursos (canais, usuários, contatos, módulos) ficam ocultos: a operação em lote é só de troca de plano.

## 2. Acompanhamento na diferença de mensalidade

- Hoje o acompanhamento é um valor do cliente e nunca muda ao trocar de plano, por isso ele não aparece no impacto.
- Correção: ao trocar de plano, se o cliente estiver com "Acompanhamento Mensal Recorrente" vazio ou zerado, passa a valer o valor padrão do plano novo (mesma regra do cadastro). Quem já tem valor próprio nunca é sobrescrito.
- O impacto passa a mostrar uma linha de acompanhamento com o valor antes e depois, somando corretamente ao "Valor após".
- Quando o cliente já tem acompanhamento próprio, a linha aparece com diferença zero, deixando claro que nada mudou ali.
- A mesma regra vale para cada cliente da troca em lote.

## 3. Filtro "Sem parceiro"

- O filtro "Parceiro" ganha a opção "Sem parceiro (N/A)" junto dos parceiros cadastrados; marcá-la lista os clientes sem parceiro vinculado, e ela pode ser combinada com parceiros específicos.

## Validação

- Filtrar por um parceiro, marcar todos, trocar o plano de uma vez e conferir movimento e valor individuais de cada cliente.
- Trocar o plano de um cliente sem acompanhamento e conferir a nova linha somada ao total.
- Trocar o plano de um cliente com acompanhamento próprio e conferir diferença zero e valor preservado.
- Aplicar "Sem parceiro" e conferir a lista.
- Repetir a seleção em massa com o filtro de Plano.
- Conferir 390, 834 e 1440 px, temas claro e escuro.

## Detalhes técnicos

- `src/routes/clientes.tsx`: estado `selecionados: Set<string>` sincronizado com `clientesOrdenados`; coluna de checkbox (`@/components/ui/checkbox`) na tabela (colSpan das linhas vazias ajustado de 10 para 11); barra de ações renderizada acima do `Card` da tabela.
- Diálogo de movimento passa a aceitar modo lote (`acaoLoteIds: string[] | null`) reutilizando `movForm`; `previaMovimento` ganha uma variante que mapeia cada cliente selecionado por `aplicarMovimentoNoCliente` + `receitaMensalCliente`; `handleSaveMovimento` itera os IDs chamando `addMovimento` por cliente, em sequência, agregando sucessos/erros.
- Acompanhamento: nova regra em `src/lib/calc/movimento.ts` (`calcularPatchMovimento`) — quando `m.planoId` muda o plano e `cliente.valorAcompanhamento` é falsy, `patch.valorAcompanhamento = plano.valorAcompanhamento ?? 0`. Como a função hoje não recebe planos, ela passa a aceitar um terceiro parâmetro opcional `planos: Plano[]`; a store (`addMovimento` em `src/lib/store.ts`) e a prévia passam os planos carregados. Sem planos, o comportamento atual é mantido.
- Linha de acompanhamento no impacto: `explicarReceitaCliente` já devolve `acompanhamento` separado dos `itens`; o comparativo em `previaMovimento` passa a comparar também esse campo e emitir a linha "Acompanhamento".
- Filtro: opção com valor sentinela `__sem_parceiro__` nas `options` do campo `parceiro` do `FilterBar`; o predicado vira `parceiroSel.includes(c.parceiroId || "__sem_parceiro__")`.
- Nenhuma mudança de schema e nenhum dado financeiro existente é alterado.
