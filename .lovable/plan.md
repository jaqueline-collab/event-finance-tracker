# Marcar como excluídos os cards que sumiram do Elora

## O que muda para você
- Card que sumiu do Elora só é marcado como excluído depois de o Elora responder "não encontrado" ao pedido daquele card pelo id. Sumir de uma lista nunca basta.
- O card não é apagado: fica guardado com a data da exclusão e sai de todos os números e telas (Resultados, Agendamentos, Agenda, Matriz, gráficos, link incorporado, conferência, Elora assistente).
- Se o card voltar a aparecer no Elora (na sincronização ou no pedido pelo id), ele é reativado sozinho.
- A verificação roda dentro da conferência diária, só nos últimos 30 dias.

## Passos
1. Retrato antes: Resultados, Agendamentos, Agenda e Matriz (Consulta Agendada, Procedimento Vendido) nos períodos 22/09 a 03/10 e 14/10 a 12/11.
2. Coluna nova "excluído em" nos cards guardados (vazia para todos hoje).
3. Na conferência diária, para cada dia dos últimos 30 em que temos mais cards que o Elora: listar no Elora os cards do dia (todos os status), achar os que só existem no nosso lado e pedir cada um pelo id. Só marca se a resposta for "não encontrado". Qualquer outro erro, tempo esgotado ou rodada da conferência incompleta: não marca nada.
4. Reativação: a sincronização normal de cards e o pedido pelo id limpam a marca quando o card volta.
5. Todas as leituras de cards passam a ignorar os marcados (lista conferida no código: indicadores, Matriz, campos, painel visual, conferência e funções do banco que leem cards e histórico).
6. Aplicar ao card 854ab39c (confirmando antes no Elora), refazer o retrato depois e dizer o que mudou.
7. Refazer a conferência de 30 dias e trazer a tabela.
8. Testes: lista ausente não marca; erro diferente de "não encontrado" não marca; rodada incompleta não marca; card que volta é reativado; card marcado não entra na contagem.

Nada é publicado.

## Detalhes técnicos
- Migração: `elora_cards_espelho.excluido_em timestamptz null` + índice parcial; funções SQL que leem cards (e `elora_cards_historico` por card) ganham `excluido_em is null`; cache invalida via sufixo de versão ("cards-excluidos-v1").
- `elora-cards.server.ts`: `registrarLeituras` grava `excluido_em = null` (reativa); novo `confirmarExclusoes(db, clienteId, ctx, dias)` com GET por id, marca só em 404.
- `mensagens-checagem.server.ts` (`conferirCliente`): chama `confirmarExclusoes` só após a etapa de cards concluir sem erro, janela 30 dias; `contarNosso` de cards filtra `excluido_em is null`.
- Regra pura de decisão em `src/lib/conferencia.ts` (`decidirExclusao`) com testes; filtro aplicado em `indicadores.server.ts`, `matriz.server.ts`, `campos-elora.server.ts`, `painel-visual.server.ts`, `incorporar.server.ts`, ferramentas da IA.
- Registro em AGENTS.md: soft delete de cards só por 404 confirmado.
