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

## 5. Exclusões não verificadas ficam explícitas e são tentadas de novo
- Quando a etapa de exclusões não roda até o fim (0 verificados por id, trava de cards não concluída, erro ou tempo esgotado), a conferência guarda isso no campo exclusoes como "não verificada".
- A tela da conferência mostra "Exclusões não verificadas nesta rodada" nessa conferência, mesmo que as contagens dos 7 dias tenham terminado.
- A rodada seguinte tenta a etapa de exclusões de novo (retomando pelo cursor por painel), sem refazer os 7 dias.
- Teste: etapa não rodada gera o aviso e é tentada na rodada seguinte; etapa completa não gera aviso.
- Prova: id e rodadas de uma conferência em que a etapa de exclusões rodou até o fim (verificados por id > 0 ou todos os painéis percorridos), com o campo exclusoes completo. Se nenhuma rodada automática acontecer a tempo na prévia, digo isso e mostro a execução manual da mesma rotina.

## 6. Linhas presas do Dr. Ricardo (8c0ojhr2)
UPDATE (só a coluna situacao; progresso intocado; só linhas com conferência concluída posterior):

```text
update elora_conferencias c
set situacao = 'interrompida'
where c.cliente_id = '8c0ojhr2'
  and c.situacao = 'conferindo'
  and c.id in (
    '42b77b57-f4cb-4a40-8886-30776901e511', -- 25/11 05:55
    '509ab4b1-8c1f-416f-b3a0-17f6dabacc14', -- 25/11 02:55
    'a0129bca-f482-4730-8886-80b38493d67e', -- 24/11 23:56
    '065f0bdd-818b-4589-a456-968ee1163630', -- 24/11 20:56
    'd58e837a-53e5-4515-be79-a8820dde6a86', -- 24/11 17:56
    '444a8d1a-ede9-44be-b8bc-0839907e4ddc', -- 24/11 14:56
    '133cd184-ef04-43d9-bb0f-533d1bb561d6', -- 24/11 11:56
    '976a4d80-27c5-430b-bac5-61f7b353b471', -- 24/11 08:56
    'b94c34c5-89cd-47a9-b3e5-13b9d7a04d3a', -- 24/11 05:55
    '0f0aa082-7c7a-4a47-9a6d-b229f1142330') -- 24/11 02:56
  and exists (select 1 from elora_conferencias d
              where d.cliente_id = c.cliente_id
                and d.situacao = 'concluida'
                and d.iniciado_em > c.iniciado_em)
returning c.id;
```

Depois: quantas linhas mudaram e as ids, e as que ficaram de fora (se houver) com o motivo.
