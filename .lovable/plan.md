# Corrigir erro 500 no registro do relatório diário

## Causa confirmada

A tabela `elora_relatorio_diario` tem a coluna `atualizado_em` (não `updated_at`), mas o trigger `trg_touch_elora_relatorio_diario` chama a função `touch_elora_parceiro_usuarios()`, que tenta gravar `NEW.updated_at` — campo inexistente nessa tabela. Por isso todo INSERT/UPDATE falha com `record "new" has no field "updated_at"`. Foi um erro de reaproveitamento na migração que criou a tabela.

## Correção

Uma migração aditiva e segura (não apaga nem altera dados):

1. Criar a função `touch_elora_relatorio_diario()` que atualiza `NEW.atualizado_em = now()` (mesmo padrão das outras funções de toque do projeto).
2. Substituir o trigger da tabela `elora_relatorio_diario` para chamar essa função nova (DROP TRIGGER apenas do trigger quebrado + CREATE TRIGGER com a função certa).

Nenhuma mudança em código do app nem nas rotas da API — a rota `registrar` já grava certo; quem quebrava era o trigger no banco.

## Validação

- Inserir e atualizar uma linha de teste para a Dra Tatiana Patruni direto no banco e confirmar que grava sem erro e que `atualizado_em` é atualizado; depois remover a linha de teste para não deixar dado falso.
- Conferir que os demais triggers que usam `touch_elora_parceiro_usuarios()` (tabelas que realmente têm `updated_at`) continuam intactos.
- Build e testes íntegros.
