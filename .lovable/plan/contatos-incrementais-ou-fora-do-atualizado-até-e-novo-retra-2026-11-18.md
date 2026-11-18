# Contatos incrementais (ou fora do "atualizado até") e novo retrato de Resultados

## 1. Testar se o Elora filtra contatos alterados
- Chamar a lista de contatos duas vezes, só leitura, para o Dr. Ricardo: sem filtro e com "alterados depois de" (última conclusão − 2h).
- Aceitar o filtro só se: a lista filtrada for menor, todos os contatos trazidos tiverem data de alteração depois do corte, e uma amostra de contatos alterados recentemente (vista no nosso banco) aparecer na lista filtrada.
- Reportar o resultado com números (total sem filtro, total filtrado, amostra conferida).

## 2a. Se o filtro funcionar
- Contatos passa a buscar só o que mudou desde a última conclusão, com sobreposição de 2h, igual a cards e mensagens. Carga inicial continua completa.
- Gravar o resultado da execução normalmente na tela da super admin.

## 2b. Se o filtro não funcionar
- "Dados atualizados até" passa a considerar só atendimentos, mensagens e cards.
- O selo "Atrasada" geral também deixa de considerar Contatos.
- Contatos continua com a sua linha própria na tela da super admin, mostrando a última conclusão (sem disparar o alerta geral).

Nos dois casos, nenhum cálculo de painel muda.

## 3. Retrato dos números de Resultados
- Antes e depois da mudança, nos períodos 22/09 a 03/10 e 14/10 a 12/11, para todos os blocos de Resultados.
- Dizer se algum número mudou e, se mudou, por quê (ex.: contato novo trazido pela sincronização).

## 4. Testes
- Teste do "atualizado até" e do selo (com e sem Contatos, conforme o caminho escolhido).
- Se 2a: teste de que o cursor de contatos usa corte − 2h após a carga inicial.
- Rodar todos os testes. Não publicar.

## Detalhes técnicos
- `atualizadoAte` e `fontesParadas` em `sync-orquestrador.server.ts`; `fonteAtrasada` em `sync-fontes.ts`; tela em `integracao-elora.tsx`.
- Contatos em `elora-espelho.server.ts` (paginação por Status); já existe chamada de contatos com `UpdatedAt.After` em `elora-cards.server.ts`, que serve de base para o teste.
- Atualizar a regra de sincronização no AGENTS.md.
