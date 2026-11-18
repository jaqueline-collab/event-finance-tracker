# Releitura completa dos cards do Dr. Ricardo + conferência de 30 dias

## Por que faltam cards de 12 a 15/11 (causa confirmada)
- Os cards que faltam são todos do "Funil de vendas - Vini", criados entre 12 e 15/11 e nunca alterados depois. Por isso, só uma busca que começasse antes da criação deles iria trazê-los.
- Uma rodada de cards ficou presa por dias com a regra antiga (painel 9 de 11). Ela já tinha passado pelo funil do Vini antes desses cards existirem e nunca concluiu.
- No dia 18, quando corrigi a sincronização, reiniciei os cards manualmente a partir de 15/11 17:50 (a última data gravada), em vez da última conclusão de verdade. Esse ponto de partida errado, escolhido por mim, pulou o que tinha sido criado de 12 a 15/11.
- A regra de busca automática atual não pula cards: ela recomeça da hora em que a rodada anterior começou (menos 1 h) e conclui a cada execução. O erro foi do reinício manual, que não vai se repetir sozinho.
- Para conferir outros clientes, rodo a conferência de cards dos últimos 30 dias em todos os clientes conectados (só leitura) e mostro se aparece falta parecida.

## Passos
1. Retrato antes: Agendamentos, Agenda e as colunas Consulta Agendada e Procedimento Vendido da Matriz, nos períodos 22/09 a 03/10 e 14/10 a 12/11.
2. Releitura completa dos cards do Dr. Ricardo: todos os painéis, abertos, ganhos, perdidos e arquivados, sem data de início, cobrindo todo o espelho. Só acrescenta ou atualiza; não apaga nada.
3. Conferência de 30 dias do Dr. Ricardo, com a tabela e a explicação de cada dia vermelho.
4. Retrato depois, comparando bloco a bloco e explicando cada diferença (por exemplo, card novo trazido que entra em Consulta Agendada).
5. Conferência de cards de 30 dias nos outros clientes conectados (só leitura), para responder se a falta se repete.
6. Rodar todos os testes. Não publicar.

## Detalhes técnicos
- `conferirCliente` ganha um parâmetro opcional de quantidade de dias (padrão 7, tela e execução diária continuam com 7), usado só para a conferência de 30 dias. Teste novo para `diasConferencia(30)`.
- Releitura: zerar o cursor de `elora_sync_estado` (fonte cards) sem `concluido_em`, para `sincronizarCards` fazer a passada completa, rodando em rodadas até concluir. A conclusão volta a ser o início da rodada.
- Retrato com `calcularCartoesServidor` (sem cache) para as visões Agendamentos e Agenda, e com o motor da Matriz para as duas colunas.
