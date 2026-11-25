# Cabeçalho em grupos no Relatório diário + aba Resultados da Dra. Nathalia

## O que a aba Resultados mostra hoje (diagnóstico)
- A aba "Resultados" da Dra. Nathalia existe (visão `1a09b50d`), mas foi criada sem nenhum bloco: a lista de blocos está vazia e ela não tem widgets antigos. Por isso a tela fica em branco ou com "Nenhum painel configurado ainda".
- Os blocos padrão que outros clientes recebem (Leads por dia, Leads por origem, funil por etapa, KPIs de ADS por regra de nome) dependem de funis e da regra antiga de ADS; para ela não teriam utilidade nem bateriam com o Relatório diário.

## 1. Cabeçalho em duas linhas (todos os clientes)
- Regra geral: se o nome da coluna tem " · ", o texto antes é o grupo e o texto depois é a coluna. Colunas vizinhas com o mesmo grupo ficam embaixo de um único cabeçalho de grupo (ex.: "Contatos novos" sobre Total, Meta ADS, Google ADS, Instagram, Orgânico, Base Doutora, Sem informação, Patrocinado, Não patrocinado).
- Coluna sem " · " (ex.: as do Dr. Ricardo) ocupa as duas linhas, como hoje. Se nenhuma coluna da tabela tiver " · ", o cabeçalho continua em uma linha só.
- Só muda a exibição: ordenar, ícone "i", menu da coluna, botão ADS, cálculo e números ficam iguais. O "i" continua procurando o texto pelo nome completo.
- Exportar continua com o nome completo ("Contatos novos · Meta ADS"), sem ambiguidade.
- Nada específico de cliente no código.

## 2. Aba Resultados no estilo do fechamento
Sem criar estrutura nova: preencher os blocos da visão "Resultados" dela com os tipos de bloco que já existem, usando a medida "Indicador da Matriz" (mesmo número do Relatório diário), para o período escolhido no seletor da aba:
- Linha 1 — Contatos novos: Total, Patrocinado, Não patrocinado (blocos de número).
- Linha 2 — Contatos novos por origem: um bloco de número por origem (Meta ADS, Google ADS, Instagram, Orgânico, Base Doutora, Sem informação).
- Linha 3 — Agendamentos: Total, Patrocinado, Não patrocinado.
- Linha 4 — Procedimentos vendidos: Total, Patrocinado, Não patrocinado.
- (Opcional, se aprovar) um bloco de barras "Contatos novos por dia" por indicador.
- É só configuração da visão dela, editável depois pelo construtor de gráficos; outros clientes não mudam.

## 3. Conferência
- Teste da regra de grupo: "A · B" vira grupo A e coluna B; sem " · " fica coluna única; grupos só juntam colunas vizinhas.
- Retrato antes/depois do Dr. Ricardo (14/10 a 12/11): todos os números iguais.
- Para a Dra. Nathalia, em 17/11 e 24/11: os números da aba Resultados batem com a soma do Relatório diário no mesmo período.
- Print do cabeçalho em 1440 e 390, e da aba Resultados. Exportar conferido com nomes completos.
- Todos os testes. Nada publicado.

## Detalhes técnicos
- `src/components/matriz-cliente.tsx`: função pura (novo helper em `src/lib/colunas-tabela.ts`) `separarGrupoColuna(nome)` e `agruparCabecalho(colunas)` gerando `{grupo, span}`; `<thead>` com duas `<tr>` quando houver grupo; colunas sem grupo usam `rowSpan=2`; "Dia" e "+ Coluna" com `rowSpan=2`. O `<button>` mostra só a parte depois de " · "; `aria-label`/`title` mantém o nome completo.
- `exportarMatriz` continua recebendo `c.nome` completo (sem alteração).
- Aba Resultados: UPDATE em `elora_dashboard_visoes.filtros` da visão `1a09b50d` com `cartoes` (`tipo: "numero"`, `medida: "indicador"`, `indicador: <chave da coluna>`, larguras 3–4), via SQL com o UPDATE mostrado antes; limpar `elora_calculo_cache` dela.
