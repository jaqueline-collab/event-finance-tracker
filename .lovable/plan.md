# MAU excedente do Distribox: por que cai em R$ 0,10

## O que foi verificado (leitura, nada alterado)

- Campo da tela "MAU excedente (R$/contato)" (`planos.tsx:446`) grava/lê `valorContatosExc`, mapeado para a coluna **`elora_planos.valor_contatos_exc`**.
- Consulta ao banco: **Distribox LTDA Exclusive (`ieaxmqv3`) = 0,095**, franquia 5.000 contatos. (Essencial Rabbit Agency também está 0,095.)
- Cliente DISTRIBOX Central de Marcas está vinculado a esse plano (`plano_id = ieaxmqv3`).
- O cálculo de MAU do fechamento (`resumo.tsx:881`) lê `plano.valorContatosExc ?? plano.valorCanaisExc ?? 0.10`, e o mapper (`mappers.ts:103`) lê `valor_contatos_exc`.

Conclusão: **o nome do campo está certo — não há erro de nome de coluna.** O código lê exatamente a coluna que tem 0,095. Se a tela mostrou 0,10, a causa não é o campo, é o **valor do plano que está em memória no navegador**.

## Causa provável (a confirmar antes de corrigir)

A store (`store.ts`) persiste `planos` no `localStorage` (`elora-control-v1`) e o `merge`/`migrate` do persist aplica o estado salvo **por cima** do estado atual na re-hidratação. Se a re-hidratação acontecer depois do `syncFromSupabase`, uma cópia antiga do plano (com 0,10, de antes da sua edição) volta a valer na tela, mesmo com o banco em 0,095.

Isso é hipótese, não fato confirmado: preciso ler o `localStorage` do preview com você logado para provar. Passo 1 do trabalho é essa confirmação.

## Plano

1. **Confirmar** o valor de `valorContatosExc` do plano Distribox no estado do navegador (preview aberto e logado). Se vier 0,10 com o banco em 0,095, causa confirmada.
2. **Corrigir a fonte de verdade dos planos**: excluir `planos` (e `custos` de catálogo) da persistência local via `partialize`, ou reordenar para o sync do banco sempre vencer a re-hidratação. Planos passam a vir sempre do banco; nada de dados de cliente/movimento/fechamento é tocado.
3. **Manter os fallbacks** (`?? 0.10`) apenas como último recurso para plano inexistente.
4. **Recalcular a prévia** do fechamento atual da DISTRIBOX com 0,095 e mostrar o novo total, sem gerar nem gravar nada.

## Sobre o recálculo

Com franquia de 5.000 contatos: `excedente = max(0, MAU informado - 5.000)`, `acréscimo = excedente × 0,095`. A diferença por contato excedente entre o valor errado e o certo é **R$ 0,005** (ex.: 10.000 de MAU → 5.000 excedentes → R$ 475,00 com 0,095 contra R$ 500,00 com 0,10). Para dar o número exato preciso do **MAU do mês da DISTRIBOX** (hoje o cadastro está com `mau = 0` e `contatos_ativos = 500`) — me diga o valor ou informe no campo da tela que eu leio de lá.

## Escopo protegido

Nenhum fechamento existente é alterado, nada é gerado ou gravado, e nenhuma migração de banco é feita. Só código de leitura de planos em `src/lib/store.ts`.
