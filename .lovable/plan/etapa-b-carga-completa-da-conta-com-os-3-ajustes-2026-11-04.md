# Etapa B — Carga completa da conta (com os 3 ajustes)

Sincronizar tudo que a API do Elora devolve para a conta de cada cliente. Canal, período, atendente, etiqueta e origem viram filtros no painel. Continuam valendo a classificação por `categoryDescription`, as colunas tipadas, UTM, tempos e filtros de data.

## Quem lê as tabelas antigas hoje
- `sincronizarIntegracaoCliente`: grava contatos em `elora_contatos_sincronizados`.
- `sincronizarConversasCliente`: grava atendimentos em `elora_conversas_classificadas`.
- `getResultadosCliente`: lê as duas. Alimenta todos os gráficos do painel, os blocos e o Relatório diário.
- Exportar e apagar dados da integração (`dashboard-widgets.functions.ts`): lista as duas.
- Teste de isolamento `integracao-elora-rls.test.ts`.

## Passo 1 — Tabelas novas (sem apagar as antigas)
- `elora_contatos_espelho`, `elora_atendimentos_espelho`, `elora_apoio_espelho` (usuários, etiquetas, canais, departamentos, campos personalizados, painéis), `elora_mensagens_espelho`, `elora_sync_estado`.
- Todas com `cliente_id`, RLS ligada sem policy, REVOKE de anon e authenticated. Só o servidor lê, depois de conferir o acesso.

## Passo 2 — Carga completa do 8c0ojhr2
- Contatos: ACTIVE, ARCHIVED e BLOCKED, com Tags, CustomFields e Portfolios, payload completo.
- Atendimentos: todos os status e canais, histórico completo, com `canal_id`, nome do canal, `categoryDescription` e `amount`.
- Listas de apoio completas.
- Limite da API: PageSize 100, pausa de 250 ms, em 429 espera 15 s, 30 s, 45 s… até 5 tentativas. Retoma pelo cursor em `elora_sync_estado`. Upsert por (cliente_id, externo_id), sem duplicar. Registra chamadas, retentativas e erros.

## Passo 3 — Painel passa a ler as tabelas novas
- `getResultadosCliente` e Exportar passam a ler as tabelas espelho para clientes que já têm carga completa.
- Dr. Gean (jvu3dzqk) e quem ainda não tem carga continuam lendo as tabelas antigas até você confirmar. Nada é migrado nem apagado.
- Widgets, visões, rótulos e filtros salvos não mudam.
- Classificação por `categoryDescription` (e `amount`). Mostro quantas conversas ficaram classificadas.

## Passo 4 — Canal deixa de travar
- `permitido` vira só rótulo na tela Canais. Apago a regra "sem canal permitido nada sincroniza" e o filtro de contagem por `permitido=true` (linha ~1900 de `integracao-elora.functions.ts`), com os testes. Listo tudo o que foi apagado.
- `historico_desde` vira só o período padrão do painel.

## Passo 5 — Mensagens (LGPD), só a estrutura
- Tabela criada fechada: texto guardado só no servidor. Nenhuma função devolve o texto ao navegador. O texto nunca aparece no painel, em tabela, filtro ou exportação.
- Colunas sem conteúdo: sessao_id, direção (TO_HUB/FROM_HUB), tipo, userId, bot ou usuário, data e hora.
- Mostro a estimativa de mensagens e de chamadas. NÃO carrego mensagens até você aprovar as outras fontes.

## Ao terminar mostro e paro
Contagens por dia (últimos 30), por canal e por status; quantos atendimentos estão classificados; chaves distintas de cada payload; estimativa de mensagens; o que foi apagado do código. Não publico.

## Detalhes técnicos
- Chave única (cliente_id, externo_id) em cada espelho; `elora_sync_estado` (cliente_id, fonte, cursor jsonb, chamadas, retentativas, erros jsonb, iniciado_em, concluido_em).
- Escritas exigem `exigirSuperAdmin`; chave lida do cofre (`credenciais.server.ts`).
- A carga roda em execuções curtas que retomam pelo cursor, para caber no limite de tempo do servidor.
- Testes novos: isolamento entre clientes nas tabelas espelho; canal não permitido ainda sincroniza; nenhuma função devolve texto de mensagem; retentativa em 429 com espera crescente.
