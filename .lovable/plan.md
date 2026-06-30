Vou corrigir o componente compartilhado de filtros para que, ao adicionar um filtro como “Tipo”, ele já abra corretamente a lista de opções para selecionar.

Plano:
1. Ajustar `FilterBar` para tratar filtros recém-adicionados como ativos mesmo quando ainda estão vazios, evitando que o chip desapareça ou fique sem abrir.
2. Substituir o gatilho do chip por um `button` acessível em vez de `div`, deixando o Popover do Radix abrir de forma confiável.
3. Remover a dependência frágil do `setTimeout` atual e controlar explicitamente a abertura do popover após adicionar o filtro.
4. Garantir que filtros multi-opção mostrem imediatamente as opções, checkbox e busca; e que filtros de data mostrem atalhos e campos de data.
5. Validar no preview pelo fluxo: clicar em “Adicionar filtro” → escolher “Tipo” → ver a lista “Custo / Fechamento mensal” e conseguir marcar/desmarcar.