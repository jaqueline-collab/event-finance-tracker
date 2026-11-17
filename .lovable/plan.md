# Sincronização: cada fonte com a sua vez, mensagens só o que é novo

## O que o banco mostra (Dr. Ricardo)
- Cards: última conclusão 15/11 17:50, 5.544 cards, último card alterado 15/11 17:08.
- Mensagens: última conclusão 15/11 17:49; cursor parado na posição 359 de uma lista de atendimentos, buscando desde 12/11.

## Por que acontece
1. **Cards nunca chega a vez.** Cada execução tem 60 s por cliente. As fontes rodam em fila (apoio, contatos, atendimentos, mensagens, cards), e mensagens pode usar até 25 s. Quando chega em cards, sobram menos de 3 s e a fila para sem rodar cards e sem registrar nada.
2. **Mensagens não termina.** Depois de cada conclusão, a próxima rodada volta 3 dias e percorre **cada atendimento** alterado desde então, um por um, cada um com sua chamada. São centenas de atendimentos por rodada. Como nunca conclui, o ponto de partida fica preso em 12/11, e a lista cresce a cada rodada (atendimentos novos entram no meio da lista e a posição salva se desloca).
3. **Os "51 dias".** Não são dias a percorrer. São os dias do relatório que precisam ser recalculados por causa de mensagens alteradas. A lista só cresce enquanto mensagens não conclui (hoje tem 52 dias).

## O que muda (nenhum cálculo muda)
1. **Cada fonte com a sua vez.** O tempo da execução é dividido entre as fontes. Cards e atendimentos rodam antes de mensagens, cada uma com tempo reservado. Mensagens fica com o tempo que sobrar e retoma de onde parou. Uma fonte demorada nunca impede as outras.
2. **Mensagens incremental.**
   - Depois da carga inicial, buscar só atendimentos alterados desde a última conclusão, com 2 horas de sobreposição de segurança (hoje são 3 dias).
   - A lista de atendimentos de uma rodada fica congelada no início, e a posição salva passa a ser o último atendimento lido, não a posição na lista. Assim, atendimento novo não desloca nada e a rodada termina.
   - O recálculo dos dias alterados continua igual, com backup.
   - Regra de correção pontual: o cursor preso hoje recomeça de 15/11 17:49 menos 2 horas. As mensagens já gravadas ficam como estão.
3. **Resultado de cada fonte em toda execução.** `elora_sync_estado` ganha: última execução (quando), concluída sim/não, registros da execução e data do último registro recebido. Vale também para cards e para fontes que ficaram sem tempo ("sem vez" é registrado, nunca some).
4. **Tela para a super admin.** Na seção de conexão com o Elora do cliente (a que já mostra o estado da sincronização), uma tabela por fonte com: última conclusão, data do último registro, última execução e um selo "Atrasada" quando passa de 6 horas sem concluir. Estende a tela que já existe, sem criar outra.

## Depois de aprovar
- Rodar a sincronização manual de cards do Dr. Ricardo e mostrar antes e depois: contagem de cards (hoje 5.544) e data do último card (hoje 15/11 17:08).
- Rodar uma rodada de mensagens e mostrar que conclui.
- Conferir que os números do painel e da Matriz não mudam nos dois períodos de sempre.
- Testes: divisão de tempo (cards sempre roda mesmo com mensagens lenta), cursor de mensagens não desloca com atendimento novo, sobreposição de 2 horas, gravação do resultado por fonte.
- Não publicar.

## Detalhes técnicos
- `sync-orquestrador.server.ts`: `rodarTodas` com orçamento por fonte (reserva mínima para cada uma, ordem apoio, contatos, atendimentos, cards, mensagens; sobra vai para mensagens); grava `ultima_execucao_*` por fonte, inclusive "sem tempo".
- `elora-espelho.server.ts`: cursor de mensagens `{ desde, ate, depoisDe: externo_id }`, lista ordenada por `externo_id` com `atualizado_em` entre `desde` e `ate`; sobreposição de 2 h.
- Migração: colunas `ultima_execucao_em`, `ultima_execucao_concluida`, `ultima_execucao_registros`, `ultimo_registro_em` em `elora_sync_estado` (continua só servidor); ajuste pontual do cursor de mensagens do cliente preso.
- `integracao-elora.functions.ts` devolve os campos novos; componente existente de status mostra a tabela.

## Condições de aceite
1. **Mensagens conclui.** Depois de aplicar, rodar rodadas manuais de mensagens do Dr. Ricardo até concluir e informar quantas rodadas e quanto tempo levou. Depois conferir em `elora_sync_estado` que as duas execuções automáticas seguintes também concluem e mostrar o resultado por fonte.
2. **Data do atendimento acompanha a última mensagem.** Contagem no período todo disponível: para cada atendimento, comparar a data de alteração com a última mensagem gravada. Listar os casos em que uma mensagem é mais nova que a data do atendimento (e de que tipo são: nota, transição, anúncio, celular etc.). Se houver casos, a busca incremental passa a incluir também esses atendimentos, para nada ficar de fora.
3. **Checagem semanal de mensagens.** Uma vez por semana, para os últimos 7 dias: sortear uma amostra de atendimentos de cada dia, contar as mensagens direto do Elora e comparar com o nosso banco. Gravar o resultado (dia, amostra, contagem nossa, contagem do Elora, diferença) numa tabela só do servidor e mostrar a última checagem na mesma tela da super admin, com um selo quando houver diferença. Só confere e registra, não altera dados.
