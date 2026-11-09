# Corrigir a Data de início de um cliente já salvo

## Onde fica
Na tela Clientes, a ficha do cliente (o quadro que abre ao clicar no cliente, com a Linha do Tempo) ganha a Data de início editável, no próprio evento "Setup Inicial" da linha do tempo (lápis igual aos outros eventos). Não entra botão nem tela nova. O cadastro inicial continua como está.

## O que acontece ao salvar
1. **Conferência no servidor (antes de gravar qualquer coisa):** procura fechamentos emitidos (não cancelados nem rascunho, e não apagados) com algum item ativo deste cliente (item não removido). Para cada um, calcula se a competência inclui o cliente com a data antiga e com a data nova. Se o resultado mudar em qualquer competência (sair ou entrar), bloqueia e mostra a lista: título, competência e data de emissão de cada fechamento. Também bloqueia se a nova data fizer o cliente entrar numa competência que já tem fechamento emitido sem ele. Fechamento emitido nunca é recalculado.
2. **Se liberado:** grava a nova Data de início no cliente; o movimento de setup desse cliente passa para a mesma data. Nenhum outro movimento muda. O vencimento é normalizado pela regra que já existe.
3. **Histórico:** grava uma linha "Data de início alterada de dd/mm/aaaa para dd/mm/aaaa", com data e usuário, sem valores e sem efeito no financeiro. Aparece na Linha do Tempo da ficha.
4. **Na tela, na hora:** Acumulado, Tempo de vida e as competências do cliente são recalculados a partir da nova data (as contas já usam a Data de início; basta atualizar o cliente e o setup na memória da tela).

Só administradores podem alterar; o servidor confere.

## Validação
- Dra. Nathalia Morato (Starter, sem parceiro): 20/10/2026 → 01/11/2026. Conferir setup em 01/11/2026, Acumulado = 1 mensalidade, fora do fechamento de outubro (se outubro já estiver emitido com ela, o sistema vai bloquear; aí eu mostro qual fechamento e paro).
- Cliente que já está em fechamento emitido: tentar mudar a data e confirmar bloqueio com o fechamento listado.
- Celular e computador, claro e escuro: o banco é externo e não consigo entrar logada daqui; confiro a tela sem login até onde der e peço que você confira logada. Testes automáticos cobrem as regras.

## Detalhes técnicos
- Nova função de servidor `alterarDataInicioCliente` (em `movimentos.functions.ts`, ampliando o que existe): checa `is_admin`, lê `elora_fechamentos` (status `emitido`, `deletado_em is null`) + `elora_fechamento_itens` (`removido_em is null`), compara inclusão por competência com a mesma regra pura usada na geração do fechamento (`calc/datas.ts`/`receita.ts`, extraída para uma função pura se preciso), e retorna `{bloqueado, fechamentos[]}` ou aplica: update `elora_clientes.data_inicio` (+ `data_vencimento` normalizada), update do movimento `tipo='setup'` do cliente, insert do movimento de histórico.
- Histórico: novo tipo de movimento `data_inicio` (mesmo padrão do tipo `parceiro`, sem impacto financeiro), ignorado por todos os cálculos. Antes, confirmo se a coluna `tipo` de `elora_movimentos` tem restrição de valores; se tiver, migração só para aceitar o novo tipo. Usuário guardado no movimento (`observacao` + quem alterou, se não houver coluna própria).
- `store.ts`: nova ação que chama a função e atualiza cliente e movimentos locais.
- Testes: inclusão/exclusão por competência (20/10→01/11 sai de outubro), bloqueio com fechamento emitido, rascunho/cancelado não bloqueia, só o setup muda de data, tipo `data_inicio` não altera Acumulado.
- Nada apagado, nada publicado.
