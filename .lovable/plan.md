# Correção do "Testar conexão" + página de mapeamento e dashboard de Resultados

## O que descobri sobre o bug do "Testar conexão"

Os três botões usam a mesma camada de chamada (mesma base, mesmo cabeçalho `Authorization: Bearer`, mesma chave do banco). A única diferença é o endereço chamado:

- "Testar conexão" → `GET /v1/status`
- "Buscar campos personalizados" → `GET /v1/contact/custom-field?NestedList=false`
- "Sincronizar" → `POST /v1/contact/filter`

Diagnóstico já confirmado na conta real (cliente com integração funcionando):

- `GET /v1/status` → HTTP 401 na resposta, com o corpo informando `httpStatusCode: 404` — a rota não existe; o gateway devolve recusa de autenticação para caminho desconhecido.
- `GET /v1/contact/custom-field?NestedList=false` → HTTP 200 com os campos da conta, usando exatamente a mesma chave.

Ou seja: a chave está correta; o endereço testado é que não existe, e o nosso tratamento traduz qualquer 401/403 como "A chave de API foi recusada".

Correção: "Testar conexão" passa a usar uma chamada real e barata de leitura (`GET /v1/contact/custom-field?NestedList=false`) e as mensagens passam a distinguir "endereço não encontrado" de "chave recusada", com o código real no detalhe do erro.

Achado extra do diagnóstico: um outro cliente está com o endereço da conta apontando para o site (`https://app.eloracrm.com.br`) em vez da API — toda chamada dele devolve HTML da página, não dados. A correção inclui detectar resposta não-JSON e avisar "O endereço informado não é o da API da conta".


## 1. Página dedicada de mapeamento

Nova rota `/clientes/{id}/integracao-elora`, restrita a equipe interna.

O modal de integração no cadastro do cliente fica só com: endereço da conta, chave de API, salvar, testar conexão, liga/desliga, e o botão "Configurar mapeamento e filtros" (habilitado apenas com integração conectada). O bloco de mapeamento sai do modal.

## 2. Campos personalizados de contato

O que já funciona hoje migra para a nova página sem mudança de comportamento: buscar campos da conta e os dois seletores (procedimento de interesse, data da consulta).

## 3. Painéis

Botão "Buscar painéis da conta" (`GET /v2/panel` com detalhes de etapas, paginado). Lista em árvore expansível: título e tipo (Gestão ou Vendas). Ao expandir, busca os campos personalizados daquele painel e mostra. Etapa informativa — mas as etapas do painel de Vendas alimentam o filtro da seção 6.

## 4. Sequências

Botão "Buscar sequências da conta" (`GET /v1/sequence`, paginado), lista por nome. Informativo.

## 5. Classificações de atendimento (por amostragem)

Não existe catálogo de classificações na API — são texto livre. Botão "Buscar classificações usadas recentemente": varre as conversas dos últimos 90 dias (com detalhes de classificação), no máximo 500 conversas, e extrai os nomes distintos usados. Dois seletores: "consulta agendada" e "procedimento vendido", que salvam o texto escolhido.

Sem nenhuma classificação na amostra: aviso "Nenhuma classificação encontrada nos últimos 90 dias — você pode reconfigurar isso quando a equipe começar a classificar atendimentos."

## 6. Filtros (salvos por cliente)

Na mesma página, aplicados tanto à sincronização quanto ao dashboard. Filtro vazio = sem restrição.

- Usuários (múltipla escolha, vindos da conta)
- Etiquetas (múltipla escolha, vindas da conta)
- Campo personalizado + valor
- Etapas do funil (do painel de Vendas escolhido)
- Campanha patrocinada: texto livre, casa com `utm.campaign`

## 7. Dashboard "Resultados" na área do cliente

Reorganização das abas:

- "Resultados" passa a ser a primeira aba, aberta por padrão.
- "Histórico" passa a se chamar "Conta".
- "Conta", "Novidades" e "Minha equipe" sobem para a linha do cabeçalho "Elora · Área do cliente", à direita, junto do sino e da foto de perfil.

Conteúdo, somado ao que já existe (Novos contatos, % vindos de anúncio, tabela de contatos):

- Consulta agendada: conversas do período com a classificação mapeada.
- Procedimento vendido: mesma lógica, outro mapeamento.
- Ranking de campanhas: contatos agrupados por campanha, do maior volume ao menor, mostrando campanha, origem, mídia, volume de leads e o link de rastreamento mais recente visto. Máximo 20 linhas. Contatos sem campanha ficam de fora do ranking.
- Total de conversas com resposta: conversas do período com ao menos uma mensagem recebida e ao menos uma enviada.

## 8. Limites reais da API, avisados na tela

- Campanha não é uma entidade da API: o ranking é derivado dos UTMs dos contatos. O link de rastreamento só aparece quando houve um clique rastreado; campanhas antigas podem ficar sem link.
- Classificação é texto livre por atendimento: se a equipe mudar o texto usado, o mapeamento para de contar até ser refeito.

## 9. Sincronização

- Contatos: continua como está, agora respeitando os filtros salvos.
- Conversas/classificações: sincronização separada e opcional, com botão próprio, mesmo controle de ritmo já aprovado (pausa entre chamadas, espera e nova tentativa em caso de bloqueio, retomada do ponto onde parou).
- "Conversas com resposta" exige uma chamada por conversa; roda em lote menor, dentro dessa sincronização separada, nunca acoplada à de contatos.
- O dashboard lê sempre do banco, nunca chama a API ao carregar.

## 10. Modelo de dados

Novas tabelas, seguindo exatamente o padrão de acesso já aprovado (GRANT restrito, sem escrita para logins comuns, leitura por equipe interna, pelo próprio cliente ou por parceiro com painel liberado):

- `elora_paineis_sincronizados` (cliente_id, painel_id, titulo, tipo, etapas, campos_personalizados, sincronizado_em)
- `elora_sequencias_sincronizadas` (cliente_id, sequencia_id, nome, sincronizado_em)
- `elora_conversas_classificadas` (cliente_id, sessao_id, category, category_name, criado_em, teve_resposta)

Colunas novas em `elora_integracao_contas` (mesmo nível restrito da chave): `classificacao_consulta_agendada`, `classificacao_procedimento_vendido`, `filtro_usuarios`, `filtro_etiquetas`, `filtro_campo_personalizado`, `filtro_etapas_funil`, `filtro_campanha`.

## Detalhes técnicos

- Migração aditiva única: as três tabelas (GRANTs antes de RLS e policies: `SELECT` para `authenticated`, `ALL` para `service_role`, nada para `anon`; policies `..._select_interno` = `is_equipe_interna()`, `..._select_cliente` = `cliente_id = cliente_do_usuario()`, `..._select_parceiro` = `parceiro_pode_ver_painel(cliente_id)`; sem policy de escrita) mais as sete colunas novas, todas nulas.
- Toda lógica nova entra em `src/lib/integracao-elora.functions.ts`, reaproveitando `requireSupabaseAuth` + `exigirEquipeInterna` e a camada única `lerApiElora` (estendida para paginação de `/v2/panel`, `/v1/sequence`, `/v2/session`, `/v1/user`, `/v1/tag`). Sem segundo caminho de autorização.
- Leituras do dashboard via `context.supabase` (RLS aplicada), agregando no servidor; nenhum dado de custo, margem ou chave trafega.
- Nova rota `src/routes/clientes.$id.integracao-elora.tsx`, com `head()` próprio; bloco de mapeamento sai de `src/components/integracao-elora.tsx`.
- Reorganização de abas em `src/routes/area-do-cliente.tsx`, com os atalhos do cabeçalho via o espaço de ações já existente no cabeçalho compartilhado.
- `src/integrations/supabase/types.ts` regenerado após a migração.

## Testes e validação

- Teste automatizado no padrão de `integracao-elora-rls.test.ts` para as três tabelas novas: cliente vê só as próprias linhas, parceiro só com vínculo e painel liberado, usuário sem vínculo não vê nada, escrita negada.
- Buscar painéis, sequências e classificações numa conta de teste e conferir contra a conta real.
- Mapear uma classificação, sincronizar conversas e conferir a contagem de "consulta agendada" manualmente.
- Aplicar um filtro de etiqueta e confirmar a redução de volume no dashboard.
- Ranking de campanhas numa conta com UTM e noutra sem: sem campanha não entra no ranking.
- Celular, tablet e computador, temas claro e escuro; build e suíte de testes íntegros.
