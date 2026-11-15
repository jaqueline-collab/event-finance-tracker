# Roadmap — Dash do cliente

## Busca do menu e confirmação — 15/11
- [ ] Busca: contraste AA nos dois temas, trecho destacado, estado vazio e seleção por setas/Enter.
- [ ] Comparar retratos atuais antes/depois e confirmar barras e contagem mensal na conversa, sem publicar.

## Ajustes de barras — 15/11
- [x] Retrato atual antes/depois, zero diferenças nos dois períodos.
- [x] BarraTabela também nas tabelas agregadas de Resultados/Resultados (novo), legadas e lista do dia.
- [x] Ocultar Agrupar quando inaplicável; ADS disponível ao leitor no Relatório diário, sem mudar cálculos; Congelar só super admin.
- [x] Relatório com arquivos dos retratos e atendimentos por mês do Dr. Ricardo.
- [ ] Verificação das telas reais autenticadas — bloqueada pela ausência de sessão autorizada no Supabase externo; barra isolada verificada no navegador.

- [x] Etapa A: layout e visual (menu, visões em pílulas, barra super admin, cartões)
- [x] Adendo: limite de Contatos corrigido; Setup +500 e filtros salvos consultados sem alteração; planos D/F detalhados para conferência. Verificação logada indisponível (Supabase externo).
- [~] Etapa B: carga completa do 8c0ojhr2 feita; painel lê o espelho (Dr. Gean nas antigas). Aguardando aprovação para mensagens e para apagar tabelas antigas.
- [ ] Etapa C: cards, relatório diário calculado, validação
- [ ] Etapa D: Campos do Elora; substituir Estrutura e campos, Mostrar ligado por padrão só controla exibição; remoções e reaproveitamento no plano do adendo.
- [ ] Etapa E: motor de widgets e 4 visões
- [ ] Etapa F: + Filtro por qualquer campo, operador, valor e escopo; remover formulário fixo sem apagar filtros salvos (plano do adendo).

- [x] Mensagens 8c0ojhr2: testar endpoint do n8n x atual, carga completa com cursor
- [x] Botão "Sincronizar agora" no app (espelho) e teste
- [x] Relatório diário 22/09–03/10 (com 30/09) x monday
- [x] Fase 1 do visual do Painel do cliente (8c0ojhr2): cabeçalho, período, chips, 4 indicadores, 6 gráficos interativos, abas sublinhadas. Conferência logada indisponível (Supabase externo).
- [x] Fase 4 (antiga Fase 2): construtor de gráficos em cartões por visão. Conferência logada em 390/834/1440 indisponível (banco externo).
- [x] Fase 3: princípio dados incompletos aplicado; visão Matriz com editor de colunas; Regras do relatório; limpeza da aba Painel do cliente. Conferência visual logada pendente (banco externo).

- [x] Etapa C parte 2: cards (abertos/ganhos/perdidos/arquivados) + histórico, configuração de indicadores, motor único, tela de validação
- [ ] Agendar sincronização de cards a cada 30 min — segredo salvo; aguardando publicação e o agendamento no n8n
- [x] Gravar o motor no relatório diário (colunas padrão 22/09–03/10)
- [x] Suporte interno global (por e-mail ou nome, só super admin) + lista extra por cliente; mapa de equipe por canal como configuração do cliente; revisar o que é específico do Dr. Ricardo
- [x] Gravar relatório por canal/atendente/equipe 22/09–03/10 com backup das 12 linhas do n8n — aguardando ok
- [x] Fonte dos dados por cliente (antiga/automática) no lugar do jvu3dzqk fixo

- [x] Novos ADS 251 x 250: causa (campanha adicionada depois), 01/10 corrigido com backup, Matriz com regra única + teste
- [x] Sincronização recalcula dias alterados com backup
- [x] Matriz: filtros padrão da visão (só super admin)
- [x] Fase 5: 794 valores idênticos; seis cartões substituídos; aba antiga retirada com compatibilidade dimensional na Matriz; comparação e catálogo únicos; suporte global centralizado; ranking 1447=562 humano+885 bot; 209 testes; 43 avisos listados; tempos medidos; relatório entregue sem publicar.
- [ ] Conferência interna autenticada em 390/834/1440 nos dois temas, exportações/congelamento/IA e tabela pronta — bloqueada por ausência de sessão autorizada no Supabase externo. Tela pública e endpoints sem segredo verificados, não substituem essa conferência.
- [ ] Cobertura diária persistida na sincronização: não registrada nesta fase; todos os intervalos sem prova permanecem parciais, sem confirmar zeros históricos. Cache novo não implementado conforme limite do plano.
- [x] Ressalva autorizada: produção só tem Resultados e zero widgets antigos do Dr. Ricardo; continuar sem recriar configurações ausentes, registrando no relatório.
- [x] Fase 6: remover seção Listas e filtros (sem tela, dados intactos); edição bloco a bloco com grade 12 col; Calendário; assistente de configuração na Elora IA; testes; relatório

## Fase 7 + correções das visões
- [x] Etapa 1: blocos e correções (topo fixo, TMR/TMA, migração com números idênticos para todos os clientes, contraste, cobertura, calendário, funil)
- [ ] Etapa 2: novos tipos de bloco
- [ ] Etapa 3: Resultados (novo) em rascunho, Agenda + Calendário, Agendamentos nova
- [x] Desempenho: retrato, SQL por dia, um cálculo por visão, cache (versão sync+config, permissão após cache), carregamento em ordem, índices, meta <3s/<1s
- [x] Sem leitura estimada gravada; tabela "Agendamentos e vendas" aguarda decisão (Matriz "—" antes de 05/11 aguarda aprovação da tabela; preenchimento via API aguarda aprovação)
- [x] Otimização final (tempos 2,4–3,6 s sem cache; meta de 3 s não garantida)
- [x] Agenda por hora (Dia/Semana)
- [x] Funil estilo Elora App
- [ ] Depois: plano separado para espelho completo de cada cliente (tempo de sincronização e carga do banco)
- [ ] Espelho completo: código pronto; regravação do cliente jvu3dzqk bloqueada (chave sem permissão em /v1/contact/filter)
- [ ] Depois: plano separado de pré-agregação de totais por dia ao fim da sincronização (< 3 s sem cache)
- [x] Exibição: vazio em branco em itens/lista do dia/detalhes/exportar; sem NaN; agrupamentos com "Sem informação"
- [x] Status do lead configurável (contato ou card de um funil), etiquetas, filtro/agrupamento/dimensão na ordem do funil; Dr. Ricardo = Etapa do Funil de vendas - Vini
- [x] Lista única "Colunas" na tabela de itens (mostrar, ocultar, reordenar, fixar à esquerda) e aba da Matriz renomeável ("Relatório diário")

- [x] Relatório diário sem seletor
- [x] Barra padrão em toda tabela
- [x] Calendário estilo Google Agenda
- [x] Filtros fixos (cache invalidado, exportar, IA, Atendente do Dr. Ricardo)
- [ ] Conferência visual com login em 390, 834 e 1440 px nos dois temas (sem login automático neste projeto)
