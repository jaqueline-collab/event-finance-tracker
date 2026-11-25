# Relatório de prova (só leitura, nada publicado)

Um único texto no chat, sem alterar código nem dados.

## 1. Antes e depois dos três clientes (11/11 a 25/11)
- Dra. Nathalia (sfwsf3t7), Dr. Ricardo e o cliente sem espelho (indyq4uq).
- Para cada dia: números antes e depois (devem ser iguais, exceto Patrocinado/Não patrocinado da Dra. Nathalia pela inclusão do Google ADS, com o tamanho da mudança) e o aviso antes/depois.

## 2. Dias que mudam só no aviso
- Lista por cliente dos dias em que o aviso "pode estar incompleto" saiu sem mudança de número.
- Confirmar que 25/11 (hoje) continua com aviso e que o cliente sem espelho não muda.

## 3. Conferência automática do Dr. Ricardo
- Id, situação, progresso, número de rodadas até concluir, linhas dos 7 dias e o campo exclusoes completo.
- Ponto em aberto já conhecido: na conferência 9eb2a7e1 a etapa de exclusões terminou com "nada foi marcado" porque a última sincronização de cards não estava marcada como concluída. Vou checar se uma rodada seguinte já rodou a etapa de verdade; se não, digo que essa parte da prova ainda falta e por quê, sem mudar nada.

## 4. Conferência visual do Relatório diário da Dra. Nathalia
- Abrir a prévia com sessão de super admin, capturar a tabela com ADS ligado e desligado (larguras de computador e celular).
- Mostrar quais colunas aparecem/somem (Meta ADS, Google ADS, Instagram) e que "Novos ADS" não aparece mais.
- Se a sessão não puder ser aberta, digo que essa prova não foi feita e por quê.

## Detalhes técnicos
- Leituras: elora_relatorio_diario_snapshot/retratos, elora_conferencias, elora_sync_estado; cálculo via montarMatrizCliente em script local.
- Prints em /mnt/documents/painel/prova-ads-*.png; nenhuma migração, nenhum commit de código.
