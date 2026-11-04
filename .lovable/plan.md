# Mensagens do 8c0ojhr2, botão "Sincronizar agora" e conferência com o monday

## 1. Carregar todas as mensagens (em lotes, com retomada)
- Para cada um dos ~2.962 atendimentos do espelho, ler `GET /chat/v1/session/{id}/message` página a página (100 por página, pausa entre chamadas, espera e nova tentativa em caso de limite 429, até 5 vezes).
- O ponto de parada (atendimento atual + página) fica salvo; se cair, continua de onde parou.
- Colunas visíveis gravadas: `sessao_id`, direção (TO_HUB/FROM_HUB), tipo, `userId`, bot ou usuário, data e hora.
- O texto fica só no registro completo, guardado no servidor (tabela sem nenhum acesso pelo navegador). Nenhuma função devolve texto ao navegador, ao painel, aos filtros ou às exportações. Coloco um teste que garante isso.
- Estimativa: ~45.500 mensagens, ~3.400 chamadas, ~25 a 40 min. No final mostro o total carregado, por direção e por tipo.

## 2. Botão "Sincronizar agora" dentro do app
- O que existe hoje: o único botão da tela de integração é "Sincronizar contatos", e ele grava nas tabelas antigas, não no espelho. A sincronização do espelho existe no servidor, mas nenhum botão a chama.
- Mudança: o botão passa a se chamar **"Sincronizar agora"** e roda o espelho completo (lista de apoio → contatos → atendimentos → mensagens), em rodadas curtas que continuam sozinhas pelo ponto de parada até terminar, mostrando o progresso. Para quem está em leitura antiga (Dr. Gean) continua igual.
- Na sincronização diária, contatos e atendimentos usam a data de atualização, com os últimos 3 dias reprocessados; as mensagens só são buscadas para esses atendimentos.
- Teste: chamo a função do botão no servidor como super admin para o 8c0ojhr2 e confiro antes/depois no banco (contagens e data da última execução).
- Limite: não consigo entrar logada no seu app por aqui (o banco é externo). Por isso não consigo clicar no botão pela tela. Vou dizer exatamente o que testei e pedir que você clique uma vez para confirmar.

## 3. Relatório diário de 22/09 a 03/10 x monday
- Regras do n8n: dia em America/Sao_Paulo pela data da mensagem. Conversa realizada = atendimento com ao menos uma mensagem TO_HUB, sem contar NOTE, TRANSITION e TRACK. "Usuário do sistema" = conversa em que alguma dessas mensagens tem `userId` real. "Bot" = as demais (só bot ou automação).
- Tabela lado a lado: dia | nosso (realizadas/usuário/bot) | monday | diferença, com destaque onde divergir. Para cada divergência, digo a causa provável que eu conseguir confirmar nos dados (ex.: fuso, atendimento contado em dois dias, canal).
- Uma dúvida que vou mostrar no resultado: o monday não tem 30/09; mostro o nosso valor desse dia separado.
- Essa conta é só uma consulta. Não mudo o Relatório diário do painel nesta rodada.

## Depois
Paro e mostro: total de mensagens, resultado do botão e a tabela comparativa. Sem publicar.

## Detalhes técnicos
- `elora-espelho.server.ts`: `mapMensagem` (direcao, tipo, user_id_elora, eh_bot, enviada_em; payload completo) e fonte `mensagens` em `sincronizarFonte` com cursor `{indiceSessao, pagina}` sobre os `externo_id` de `elora_atendimentos_espelho` ordenados; upsert em `(cliente_id, externo_id)`.
- `elora-espelho.functions.ts`: enum de fonte inclui `mensagens`; nova `sincronizarAgoraCliente` (super admin) que avança fontes em sequência dentro de ~25 s e devolve `{concluido, fonte, registros}`; o cliente repete até concluir.
- `integracao-elora.tsx`: botão "Sincronizar agora" com laço e progresso.
- Teste: nenhuma função exportada para o navegador seleciona `payload` de `elora_mensagens_espelho`; teste de `mapMensagem` e da regra de classificação diária.
- Comparação: SQL só de leitura sobre `elora_mensagens_espelho`.
