# Relatório diário separado por canal, atendente e equipe (conferência antes de gravar)

Nada foi gravado. Esta rodada só calcula e mostra. A gravação (etapa 4) fica para depois do seu ok.

## 1. Descobrir o corte exato do n8n
- As 12 linhas de 25 e 26/09 usam: canal = número ou @ do canal, atendente = nome do atendente ou vazio, equipe = "Atendimento", "Social Seller" ou "Pós Operatório".
- Essas equipes não são os departamentos do Elora (Chronos Atendimento, Ricardo Atendimento, Pós Operatório, SDR Rabbit). Antes de calcular, levanto de onde vem cada uma: um mapa canal → equipe, ou departamento → equipe. Também vejo a quem o n8n atribui uma conversa (atendente responsável, último atendente, vazio quando foi só o bot) e um contato novo. Se o n8n tiver o mapa em algum lugar que eu não consiga ler, paro e te pergunto.
- O corte vira configuração do cliente (mapa de equipe por canal ou departamento), nada fixo no código para o Dr. Ricardo.

## 2. Motor por canal/atendente/equipe
- As 5 colunas padrão (novos contatos, novos ADS, conversas realizadas, usuário, bot) passam a sair por dia + canal + atendente + equipe.
- Regras de cada coluna continuam as validadas: sem IMPORTED, ADS por campanha, conversa = mensagem recebida, usuário = enviada por pessoa pela plataforma.
- Cada conversa e cada contato caem em uma única linha, para a soma do dia não contar duas vezes.
- O resultado já sai no formato que o relatório diário lê, para os filtros de canal, atendente e equipe funcionarem nos 12 dias.

## 3. Conferência (mostrar e parar)
- Por dia, de 22/09 a 03/10: soma das linhas separadas contra o monday nas 5 colunas, marcando onde divergir.
- 25 e 26/09: comparação linha a linha com as 12 linhas do n8n, mostrando quais linhas só existem de um lado e as diferenças por coluna. O n8n soma 99 conversas em 25/09 e o monday tem 164, então já espero diferenças. Explico cada uma.
- Testes: soma das linhas = total do dia, conversa sem atendente vai para atendente vazio, cliente sem mapa de equipe deixa a equipe vazia.

## 4. Só depois do seu ok
- Criar `elora_relatorio_diario_backup` (cópia completa das 12 linhas + data e motivo, só servidor) e conferir campo a campo.
- Gravar as linhas separadas dos 12 dias, substituindo as 12 do n8n.
- Mostrar a consulta de restauração, pronta mas não executada.

## Fora
- Colunas de cards não são gravadas. Nada publicado.
