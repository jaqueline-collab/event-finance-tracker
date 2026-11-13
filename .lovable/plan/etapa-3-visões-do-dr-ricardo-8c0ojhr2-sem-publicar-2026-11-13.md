# Etapa 3 — Visões do Dr. Ricardo (8c0ojhr2), sem publicar

## 1. "Resultados (novo)" — rascunho, invisível ao cliente
A visão Resultados atual fica intacta. A nova visão terá só:
- Indicadores do topo, número com comparação: Novos contatos, Novas conversas, TMR, TMA.
- Barras empilhadas por dia: Novos contatos e Leads de ADS, com alternância para Conversas.
- Pizza de contatos por Canal (total e %).
- Funil em modo Ranking das campanhas patrocinadas.
- Matriz por UTM com "Só patrocinados" ligado.

Ficam fora desta visão: rosca de Origem, funil de vendas, tabela de itens e Dois valores.

## 2. Nova visão "Agendamentos" — rascunho, invisível ao cliente
- Dois valores "Consultas agendadas": quantidade + valor correspondente.
- Dois valores "Procedimentos vendidos": quantidade + valor correspondente.
- Tabela de itens com as colunas: Nome, Telefone, Origem, Canal, Procedimento de interesse (card), Status do lead, Data da consulta, Valor da consulta, Data do procedimento, Valor do card, UTM origem, UTM campanha, UTM URL de referência, ID do card.
- Se alguma dessas colunas não existir nos dados do cliente, eu paro e mostro qual falta, sem inventar campo.

## 3. Agenda
- Preservar todos os blocos atuais, inclusive os 4 indicadores migrados na Etapa 1; nada removido nem reordenado.
- Acrescentar o Calendário "Agendamentos" (Data da consulta; Data do procedimento como data alternável).

## 4. Conferência antes de gravar (14/10 a 12/11)
Os blocos de agendamento precisam bater com a Matriz:

| Indicador | Esperado |
|---|---|
| Consulta Agendada | 32 |
| Consulta Agendada ADS | 10 |
| Procedimento Vendido | 48 |

Também confiro os indicadores do topo e que a Matriz por UTM soma o total de novas conversas.
Qualquer número diferente: paro e mostro, sem gravar nada.

## 5. Entrega
- Gravação só depois da conferência, registrada para poder desfazer.
- Testes: Resultados atual não muda; Agenda mantém todos os blocos; rascunhos não aparecem ao cliente; números dos blocos de agendamento iguais aos da Matriz.
- Conferência em 390/834/1440, claro e escuro (o painel logado depende do acesso ao banco externo; se indisponível, aviso).
- Relatório com a tabela de conferência. Não publicar.

## Detalhes técnicos
- Visões em `elora_dashboard_visoes` via `dashboard-visoes.functions.ts` (só super admin), cartões em `filtros.cartoes`; histórico em `elora_config_acoes`.
- Para bater com a Matriz, o Dois valores ganha a opção de usar um indicador da Matriz como quantidade (`montarMatrizCliente`), e o valor soma o campo escolhido dos mesmos cards contados por esse indicador. Assim não nasce uma segunda regra de contagem.
- A tabela de itens da visão Agendamentos lista os cards contados pelos indicadores de agendamento no período.
- Colunas de dinheiro continuam ocultas para parceiro sem permissão de valores.
