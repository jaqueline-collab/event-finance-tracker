# Gravação do relatório diário 22/09 a 03/10 (só colunas padrão)

O n8n gravou 25 e 26/09 em 12 linhas (8 + 4), separadas por canal, atendente e equipe. Você escolheu gravar uma linha por dia com o total.

## 1. Backup (antes de qualquer gravação)
- Nova tabela `elora_relatorio_diario_backup`: cópia completa de cada linha (todas as colunas, id original incluído) + data do backup + motivo. Só servidor (sem acesso pela API do navegador).
- Copiar as 12 linhas de 25 e 26/09 do 8c0ojhr2.
- Conferir: 12 linhas no backup, campo a campo iguais às originais. Se não bater, paro sem gravar.

## 2. Gravação
- Tirar do relatório as 12 linhas de 25 e 26/09 (ficam inteiras no backup).
- Gravar 12 linhas, uma por dia de 22/09 a 03/10, com canal/atendente/equipe vazios e estimado = não:
  novos contatos, novos ADS, conversas realizadas, usuário, bot (valores do motor, que batem com o monday).
- Colunas de cards (consulta/procedimento e ADS) ficam 0, como estão hoje. Nada de cards gravado.
- Nenhum outro dia ou cliente é mexido.

## 3. Prova
- Mostrar a tabela final gravada dos 12 dias, ao lado do monday.
- Prova de volta: consulta que reconstrói 25 e 26/09 a partir do backup e mostra que os totais voltam a 90/... (os valores originais do n8n), mais o comando de restauração pronto (não executado).

## Fora
- Não publicar. Parar e mostrar.
