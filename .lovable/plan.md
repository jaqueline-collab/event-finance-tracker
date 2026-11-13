# Etapa 3 — Visões do Dr. Ricardo (8c0ojhr2), sem publicar

## Objetivo
Montar a nova visão de Resultados em rascunho e completar a Agenda, sem tocar no que o cliente vê hoje.

## 1. "Resultados (novo)" em rascunho
- Criar uma visão nova "Resultados (novo)" como **cópia** da Resultados atual, marcada como rascunho (invisível ao cliente).
- A visão Resultados atual fica intacta até sua aprovação; nenhuma linha dela é alterada.
- Blocos da nova visão, usando os tipos da Etapa 2:
  - Indicadores do topo (os mesmos 5 já migrados).
  - Dois valores: "Valor do card" (soma) + quantidade de cards.
  - Barras empilhadas com alternância: Novos leads / Conversas / Leads de ADS.
  - Rosca de Origem (patrocinado/orgânico pela regra de ADS do motor), com total e %.
  - Funil do "Funil de vendas - Vini" nos dois modos (padrão: Etapas).
  - Matriz por UTM (campanha; opção Só patrocinados).
  - Tabela de itens: nome, telefone, Procedimento de interesse (campo do card `procedimento-34`), "Valor do card", Origem.
- Ficam de fora: Compareceu, Data consulta fechada, Data procedimento fechado.

## 2. Agenda
- Preservar todos os blocos atuais, inclusive os 4 indicadores migrados na Etapa 1; nada é removido nem reordenado.
- Acrescentar o bloco Calendário com título "Agendamentos", campo de data = Data da consulta (card), com Data do procedimento como data alternável.

## 3. Conferência antes de gravar
- Listar as visões que serão criadas/alteradas e calcular cada bloco novo no período padrão (30 dias) e em 22/09–03/10.
- Comparar com os números já conhecidos (Novos leads, Conversas, Leads de ADS, TMR, Consulta Agendada, Procedimento Vendido). A Matriz por UTM tem de somar o total de novas conversas.
- **Qualquer número diferente → paro, mostro e pergunto, sem gravar.**
- Gravação registrada em `elora_config_acoes` para poder desfazer.

## 4. Entrega
- Testes (incluindo: Resultados atual não muda; Agenda mantém todos os blocos; rascunho não aparece ao cliente).
- Conferência em 390/834/1440, claro e escuro (painel logado depende do acesso ao banco externo; se indisponível, aviso).
- Relatório com tabela antes/depois. Não publicar.

## Detalhes técnicos
- Visões em `elora_dashboard_visoes` via `dashboard-visoes.functions.ts` (só super admin); cartões em `filtros.cartoes`.
- Cálculo pelos mesmos caminhos (`calcularCartao`, `cartaoDoPainel`, `montarMatrizCliente`), sem regra nova de métrica.
