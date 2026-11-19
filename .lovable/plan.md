# Conferência diária automática: concluir em até 3 rodadas

## Resposta 1 — Política de Privacidade e rodapé
- O texto completo da página será mostrado no chat, exatamente como está hoje (9 seções).
- A página e o rodapé em colunas já estão prontos na prévia. Falta só publicar, e nada foi publicado.

## Resposta 2 — Ainda não estava corrigido
As três conferências automáticas de 19/11 continuam como "conferindo", paradas em "13/11 · Cards criados (3 de 28)". A causa foi confirmada no código e no banco:

1. **Uma conferência nova a cada rodada:** a conferência aberta só é retomada se tiver sido mexida na última 1 hora. Como a sincronização roda a cada 3 horas, toda rodada abre uma nova.
2. **Sem avanço dentro do passo de cards:** o Dr. Ricardo tem 12 painéis. Para cada dia, o passo de cards faz 12 × 4 situações = 48 pedidos ao Elora, um depois do outro. Isso passa dos 8 segundos que a conferência recebe por rodada. O progresso só é gravado quando o passo termina, então toda rodada recomeça do zero.

## O que vou mudar
1. **Retomar sempre a conferência aberta:** a rodada seguinte continua a conferência automática aberta, sem limite de 1 hora. Só abre outra se a aberta tiver mais de 24 horas. Nesse caso, a antiga fica marcada como "interrompida" e não fica pendurada.
2. **Gravar o avanço depois de cada pedido:** o cursor passa a guardar também o painel e a situação dentro do passo de cards. Assim, toda rodada avança, mesmo quando é cortada no meio.
3. **Passo de cards mais leve:** em vez de 48 pedidos por dia (336 em 7 dias), faço 48 pedidos uma única vez para a janela inteira de 7 dias. Cada card é separado pelo dia de criação, no horário de Brasília. A soma e a regra continuam as mesmas: abertos, ganhos, perdidos e arquivados, sem contar cards excluídos.
4. **Tempo próprio para a conferência:** cada rodada reserva cerca de 30 segundos para a conferência, dentro do tempo total que já existe. O tempo das fontes de sincronização não diminui.
5. **Verificação de cards excluídos como etapa própria:** ela roda depois das contagens dos 7 dias (que ficam gravadas antes), com cursor próprio gravado depois de cada pedido (painel, situação, página e card sendo pedido pelo id). A janela de 30 dias e o limite de segurança (mais de 10 cards ou 2% da janela: não marca nenhum e registra aviso) continuam iguais. Se ela for cortada, retoma na rodada seguinte sem refazer as contagens.
6. **As três conferências travadas de 19/11** serão marcadas como "interrompidas". Nenhuma linha será apagada.

## Como vou provar
- Testes: retomar em vez de abrir outra; o cursor avança no meio dos cards; os cards são separados pelo dia em Brasília; a conferência é concluída em até 3 rodadas simuladas.
- Prova real na prévia: vou chamar a rodada automática do Dr. Ricardo até a conferência terminar. Vou trazer quantas rodadas foram necessárias (no máximo 3, contando a etapa de exclusões), o id, a situação "concluída", o progresso, as linhas dos 7 dias e o campo exclusoes, para mostrar que a verificação de cards excluídos também rodou.
- Se as exclusões não couberem nas 3 rodadas, aviso com o número real de rodadas em vez de dizer que está pronto.
- Vou conferir que os números de cada dia são iguais aos da última conferência manual concluída, nos dias em comum.
- Não vou publicar. A correção fica só na prévia até você aprovar.

## Detalhes técnicos
- `mensagens-checagem.server.ts`: a regra de retomada usa a validade de 24h; a situação "interrompida" passa a existir; a etapa de cards é feita em lote na janela, com cursor `cards: {p, s, pg, porDia}` gravado depois de cada pedido; `salvar()` é chamado depois de cada chamada.
- `sync-cards.ts`: a conferência recebe um prazo de cerca de 30s, reservado antes de `rodarTodas`.
- `conferencia.ts`: funções puras para decidir entre retomar e abrir outra, e para separar os cards por dia; com testes.
- `verificarExclusoes`: o cursor `excl` passa a ser gravado depois de cada pedido (hoje ele só é gravado no fim do prazo).
- Atualizar no banco a situação das 3 conferências de 19/11 para "interrompida" (é só uma atualização de dados).
