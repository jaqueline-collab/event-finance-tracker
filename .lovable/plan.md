# Plano: totais por dia prontos ao fim de cada sincronização

## Objetivo
As visões leem totais já calculados em vez de recalcular a cada abertura. Meta: toda visão abre em menos de 3 s sem depender do cache. Os números continuam idênticos ao retrato.

## Como funciona
1. Ao fim de cada sincronização (e quando mudar uma configuração que afeta números), o servidor recalcula os totais por dia do cliente e grava numa tabela de totais.
2. Os totais são guardados por dia e por dimensão: canal, atendente, equipe, origem, campanha/UTM, etapa e indicador da Matriz.
3. As visões e a Matriz leem essas linhas prontas (algumas centenas, em vez de milhares de contatos e mensagens) e só somam o período pedido.
4. Blocos que precisam de registro a registro (Agenda, tabelas de itens, filtros por campo livre) continuam lendo o espelho, mas só o recorte do período.
5. Se os totais ainda estiverem sendo gravados, a visão usa o cálculo atual (nunca mostra número velho), e a tela informa "atualizando".

## Garantias
- Retrato antes e depois em todas as visões e na Matriz, nos dois períodos de referência; parar se algum número mudar.
- Versão da sincronização e de configuração gravada junto dos totais: total de versão antiga nunca é servido.
- Permissão de ver valores continua aplicada na leitura, depois dos totais.

## Impacto estimado
- Abertura: de 2,4–3,7 s para cerca de 0,5–1,5 s sem cache nas visões de totais (Resultados, Resultados (novo), Matriz); Agenda e Agendamentos dependem do recorte do período, cerca de 1–2 s.
- Sincronização: mais ~3–8 s por cliente no fim de cada rodada.
- Banco: algumas dezenas de milhares de linhas pequenas por cliente (poucos MB).

## Detalhes técnicos
- Tabela `elora_totais_dia` (cliente, dia, dimensões, chave do indicador, valor, versões), só servidor (RLS sem política, service_role).
- Gravação: função após `sincronizar*` e após `aplicarProposta`/escritas de config, reaproveitando `calcularCorteCliente` e o motor de indicadores (uma regra só).
- Leitura: `linhasPadrao` e `cartaoDoPainel` leem totais quando a versão bate; senão, caem no caminho atual.
- Testes: mesma saída do motor com e sem totais prontos.
