# Etapa B — Carga completa da conta (sem trava de canal)

Substitui as regras de canal, contatos e histórico dos adendos anteriores. Continua valendo: classificação por `categoryDescription`, colunas tipadas, UTM, tempos, filtros de data, custo da carga.

## Regra
Sincronizar tudo que a API do Elora devolve para a conta de cada cliente. Canal, período, atendente, etiqueta e origem viram filtros na montagem do painel.

## Fontes a sincronizar (por cliente)
1. **Contatos:** todos, ACTIVE + ARCHIVED + BLOCKED, com Tags, CustomFields e Portfolios, payload completo. Sem recorte por data nem canal.
2. **Atendimentos:** todos, qualquer status e canal, desde o início do histórico da API, com os 4 detalhes aceitos. Guardar `canal_id` e nome do canal em cada um.
3. **Listas de apoio:** usuários, etiquetas, canais, departamentos (com nome, se houver endpoint), campos personalizados, painéis. Tudo entra no catálogo de campos.
4. **Mensagens:** fonte própria, por atendimento, payload completo. Primeiro mostro a estimativa (mensagens e chamadas); carrego por último, em lotes, sem travar as outras.
5. Cartões e painéis do CRM ficam para a Etapa C, completos.

## Mudanças de regra
- `permitido` deixa de travar a sincronização; vira só rótulo na tela Canais. Canais novos aparecem sozinhos.
- Removo do código e dos testes a regra "sem canal permitido nada sincroniza" e listo exatamente o que foi apagado.
- `historico_desde` passa a ser só o período que o painel abre por padrão.

## Ordem de execução
1. Criar tabelas espelho (contatos, atendimentos, listas de apoio, mensagens) + controle de sincronização.
2. Carga completa do 8c0ojhr2 (~11,6 mil contatos, ~3 mil atendimentos), direto, sem carga de teste de 7 dias.
3. Mostrar: contagem por dia (últimos 30), por canal, por status, e chaves distintas de cada payload; estimativa de mensagens.
4. Após sua aprovação: carregar mensagens em lotes.
5. Incremental: por data de atualização, reprocessando os últimos 3 dias.

## Isolamento
Tudo com `cliente_id`; RLS ligada sem policy (só servidor); leitura apenas por função de servidor que confere o acesso ao cliente. Nenhum dado de um cliente aparece para outro. Nada de financeiro é tocado ou apagado.

## Detalhes técnicos
- Tabelas: `elora_contatos_espelho`, `elora_atendimentos_espelho` (canal_id, canal_nome, status, categoryDescription, utm_*, atendente_id, tempos, created/updated/closed, payload jsonb), `elora_apoio_espelho` (tipo: usuario|etiqueta|canal|departamento|campo|painel, externo_id, nome, payload), `elora_mensagens_espelho` (sessao_id, payload), `elora_sync_estado` (fonte, cursor, ultima_execucao, contagens, erro). Chave única (cliente_id, externo_id). GRANT só para service_role.
- Upsert em lotes, paginação até o fim, chave lida do cofre (`credenciais.server.ts`), escrita exige `exigirSuperAdmin`.
- Testes: remover os de trava por canal; novos para isolamento entre clientes e para "canal não permitido ainda sincroniza".
- Migração roda no banco externo `eloracrm-prod`; não publico até sua conferência.
