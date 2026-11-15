# Quatro pedidos: Relatório diário sem seletor, barra padrão, Calendário estilo Google Agenda, filtros fixos

Regras gerais: retrato antes e depois (Resultados, Resultados novo, Agenda, Agendamentos, Relatório diário; 14/10–12/11 e 22/09–03/10), parar e mostrar se algum número mudar, sem publicar, nada apagado.

## 1) Relatório diário sem seletor
- A aba "Relatório diário" abre sempre na Matriz (cálculo atual). O seletor "Por dimensões · registros e congelamentos" sai.
- Registros da automação e congelamentos somem das telas de cliente e parceiro; os dados continuam guardados.
- Super admin: acesso discreto em Configuração > "Histórico do relatório (antigo)", só leitura, se ainda houver uso.
- ADS, Colunas, Baixar e Congelar passam para a barra padrão (item 2).

## 2) Barra padrão em toda tabela
- Um único componente de barra usado na tabela de itens, Relatório diário, tabelas de Resultados e qualquer tabela futura do construtor.
- Sempre na mesma posição: "Colunas" (mostrar, ocultar, reordenar, fixar à esquerda, restaurar padrão), "Agrupar por", "Exportar"; espaço à direita para ações próprias (ADS, Congelar) no mesmo estilo.
- Quem vê muda sem gravar; super admin, no modo Editar, salva como padrão do bloco.
- A lista "Colunas" atual é ampliada (não duplicada) e ganha "Restaurar padrão".

## 3) Calendário estilo Google Agenda
- Substitui o Dia/Semana recém-feito.
- Alternância Dia, Semana, Mês, Agenda (lista); botão Hoje, setas, título do período.
- Dia/Semana: grade por hora, compromisso como bloco no horário com altura da duração (30 min sem duração), nome e hora; horários iguais lado a lado; linha do horário atual; hoje destacado; intervalo de horas segue os compromissos.
- Mês: até N por dia e "+N mais"; clicar no dia abre o Dia.
- Clique no compromisso: cartão flutuante com hora, nome, tipo, telefone, procedimento, valor (valor só com permissão; vazio fica em branco).
- Consulta amarelo, procedimento verde (tokens da marca, contraste AA); filtro Todos/Consultas/Procedimentos mantido.
- Semana começa no domingo; opção por cliente para segunda (configuração da super admin).

## 4) Filtros fixos
- Modo Editar: "+ Filtro fixo" em cada bloco e "Filtro fixo da visão", com os mesmos campos e operadores do "+ Filtro" (catálogo Campos do Elora, qualquer fonte).
- Aplicados no servidor antes dos cálculos e dos filtros de quem vê; quem vê não remove, só acrescenta os próprios sem gravar.
- Selo discreto com cadeado ("Atendente: Vinicius") no bloco/visão.
- Tabela de itens ganha a fonte Atendimentos (além de contato e card), para o exemplo do Vinicius.
- Elora IA recebe e respeita os filtros fixos do bloco/visão nas respostas.
- Teste: bloco com filtro fixo dá o mesmo número que a Matriz filtrada pelo mesmo filtro.
- Criar, editar ou remover um filtro fixo invalida na hora o cache daquele bloco/visão.
- Filtro fixo vale também no Exportar e na Elora IA; teste exporta um bloco filtrado e confere que só saem as linhas do filtro.
- Conferir no banco que o campo Atendente está preenchido nos atendimentos do Dr. Ricardo (relatório com quantos têm e não têm); sem atendente, a célula fica em branco e o agrupamento mostra "Sem informação".

## Verificação
- Testes por item (barra única, regras do calendário: posição/altura/sobreposição/início da semana; filtro fixo não removível, combinado com o de quem vê, igual à Matriz filtrada; aba sem seletor).
- Retrato antes/depois: zero diferenças.
- Conferência visual com login em 390, 834 e 1440 px, temas claro e escuro.

## Detalhes técnicos
- Filtros fixos gravados em `elora_dashboard_visoes.filtros` (por cartão e por visão), lidos só no servidor em `graficos.functions.ts`/`matriz.server.ts`; chave do cache inclui os filtros fixos.
- Barra: componente único em `src/components/`, estado em `colunas-tabela.ts` ampliado.
- Início da semana por cliente em `elora_relatorio_corte_config` (nova coluna, migração).
- Fonte Atendimentos reaproveita o espelho de conversas e o catálogo de campos; texto de mensagem nunca sai do servidor.
- Código do relatório antigo mantido; só a entrada na tela muda.
