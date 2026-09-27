# Canal e Atendente no Relatório diário

## Situação atual (conferida)

- A tela e a rota `registrar` já foram preparadas para Canal e Atendente: filtros, botão "Colunas" e envio em lista já estão no código.
- O arquivo com a mudança do banco (0022) existe, mas **não foi aplicado**. A tabela ainda não tem as colunas `canal`/`atendente` e a chave única continua sendo (cliente_id, data). Hoje, qualquer gravação feita pela automação falha.

## O que será feito

1. **Banco**: aplicar a mudança de fato. Serão adicionadas as colunas `canal` e `atendente` (texto, não nulas, valor padrão ''), e a chave única passa a ser (cliente_id, data, canal, atendente). As 3 linhas que já existem ficam com '' e continuam válidas. Nenhum dado será apagado.
2. **Rota registrar**: conferir que ela aceita um objeto ou uma lista (até 500 linhas), com `canal`/`atendente` opcionais (vazio/nulo vira ''), e grava tudo de uma vez em lote usando a nova chave.
3. **Leitura**: conferir que `getRelatorioDiarioCliente` devolve `canal` e `atendente`.
4. **Tela, aba Relatório diário**:
   - Filtros Canal e Atendente, preenchidos com os valores do período carregado, com a opção "Todos". Um valor vazio aparece como "Não informado".
   - Botão "Colunas" com caixas de marcar para as 10 colunas.
   - A linha Total soma só as linhas que passam pelos filtros.

## Validação

- Enviar à rota uma lista para a Dra Tatiana Patruni com 2 combinações de canal e atendente no mesmo dia: devem ser gravadas 2 linhas. Reenviar a mesma lista deve atualizar essas linhas sem duplicar. Depois, remover as linhas de teste.
- Na tela: os filtros alteram a tabela e o Total, e ocultar colunas funciona. Conferir no celular, no tablet e no computador, com temas claro e escuro.
- Build e testes sem erros.
