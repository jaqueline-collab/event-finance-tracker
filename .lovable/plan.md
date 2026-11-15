# Sincronização parada e "Atendimentos por canal" vazio

Regras: retrato antes e depois (14/10–12/11 e 22/09–03/10), parar se algum número já existente mudar sem eu mostrar, não publicar.

## A) Sincronização parada — diagnóstico já confirmado

1. **O agendamento só sincroniza cards.** O `elora-sync-3h` chama `/api/public/sync-cards`, que só executa a etapa de cards. Contatos, atendimentos, mensagens e apoio nunca rodaram pelo agendamento; só avançavam em sincronizações manuais (a última em 08–09/11). Por isso "só cards avança". Não é a etapa de cards consumindo o tempo.
2. **O `{"erro":true}` esconde a mensagem.** O código engole a exceção e devolve só `erro: true`, sem gravar nada. O estado de cards está com o cursor no painel 11 de 11 (já passou do último), o que indica que a falha acontece no fechamento da rodada (marcar concluído, recalcular dias ou ler o contexto). A causa exata ainda **não está confirmada**: o passo 1 da execução é capturá-la.
3. **Mensagens desde 05/11:** o cursor de mensagens está parado na sessão 573, de uma carga parcial manual que não terminou.

## Correção
1. Capturar o erro real: rodar a etapa de cards do Dr. Ricardo uma vez no servidor e registrar a mensagem. Vou te mostrar a mensagem antes de corrigir.
2. Gravar o erro: toda falha de etapa grava em `elora_sync_estado.erros` (data/hora, etapa, mensagem curta, sem chave). Na configuração da super admin, a aba de sincronização mostra a última falha por fonte.
3. Corrigir a causa encontrada.
4. Fazer o agendamento rodar todas as fontes em sequência (apoio → contatos → atendimentos → mensagens → cards). Cada fonte tem seu próprio tempo limite e continua do ponto salvo. Se uma fonte falhar, o erro é gravado e as outras continuam.
5. Recuperar o atraso: rodar a sincronização manual do Dr. Ricardo fora das janelas automáticas (xx:55). Ela continua até atendimentos e mensagens chegarem a hoje. Depois confiro se a contagem de atendimentos bate com o Elora App (3.796 hoje) e se há mensagem do dia. O relatório gravado só é regravado nos dias alterados, com backup, como já funciona hoje.

Observação: com os dados novos, os números de 09/11 em diante vão subir, o que é esperado. Os períodos do retrato (até 12/11) também incluem 09–12/11. Vou mostrar a tabela de antes e depois e explicar cada diferença, sem esconder nada.

## B) "Atendimentos por canal" vazio
1. Reproduzir o bloco com os dados reais e achar onde ele perde os registros. A suspeita é a regra que converte a dimensão "canal" para a fonte Atendimentos, mas ela **não está confirmada**.
2. Corrigir para que o agrupamento use o canal do próprio atendimento, com o nome vindo da regra única de nomes de canal. Canal sem apelido aparece como "Canal sem nome", e atendimento sem canal aparece como "Sem informação". Nenhum canal some.
3. Teste: a soma do bloco é igual à contagem de atendimentos do período, por canal e no total.

## Detalhes técnicos
- Arquivos: `src/routes/api/public/sync-cards.ts` (rodar todas as fontes, gravar o erro), `elora-espelho.server.ts` / `elora-cards.server.ts` (gravar `erros` no catch), a tela de sincronização em `configuracao-cliente-sheet.tsx`, e a dimensão de canal para a fonte atendimento em `graficos.ts` / `cartao-calculo.server.ts`.
- Testes novos: erro de etapa gravado sem interromper as demais; total por canal igual ao total de atendimentos.
