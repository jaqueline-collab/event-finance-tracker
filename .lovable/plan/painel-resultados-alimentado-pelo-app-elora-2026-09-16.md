# Painel "Resultados" alimentado pelo app Elora

Objetivo: puxar os contatos da conta do cliente no app Elora e mostrá-los no painel do cliente, com resumo de quantos contatos novos entraram e quantos vieram de anúncio.

## 1. Mapeamento dos campos personalizados

Na aba "Integração Elora (app)" do cadastro interno do cliente, antes de a sincronização funcionar:

- Botão "Buscar campos personalizados da conta": lê a lista de campos da conta usando a chave já salva.
- A tela mostra os campos encontrados (nome visível + chave técnica) e dois seletores:
  - "Qual campo é Procedimento de interesse?"
  - "Qual campo é Data da consulta?"
- Escolha só por lista, nunca digitando chave à mão. A escolha fica guardada na integração do cliente.
- Sem mapeamento salvo, o botão "Sincronizar" fica desabilitado com o aviso "Configure o mapeamento de campos primeiro".
- Pode ser refeito quando a conta do cliente mudar os campos.

Sobre o endereço da conta: o campo "Endereço da conta" que já existe na aba é o endereço da API. Como a documentação mostra dois domínios diferentes, nada fica fixo no código — o endereço é o que estiver salvo por cliente, e o botão "Testar conexão" confirma qual funciona antes de qualquer sincronização.

## 2. Sincronização de rotina

Ao clicar em "Sincronizar" (manual agora, automático depois):

- Busca contatos criados a partir da última sincronização bem-sucedida (na primeira vez, desde o começo), em páginas de 100, até não haver mais páginas.
- De cada contato guarda: nome, telefone, data de criação, dados de anúncio (quando vierem preenchidos) e os dois campos personalizados conforme o mapeamento.
- Cada contato é gravado uma única vez, identificado pelo código dele no app — sincronizar duas vezes não duplica.
- No fim, atualiza a data da última sincronização.
- Falhas aparecem como "Falha ao sincronizar: [motivo]", sem travar a tela.

## 3. Painel "Resultados" na área do cliente

Substitui o bloco reservado de hoje:

- Dois cartões: "Novos contatos" (total no período) e "% vindos de anúncio" (contatos com dados de anúncio ÷ total do período).
- Filtro de período: últimos 7 dias, últimos 30 dias (padrão) ou intervalo escolhido.
- Tabela: nome, telefone, data de criação, origem (etiqueta "Anúncio" com origem/mídia/campanha ao passar o mouse, ou "Orgânico"), procedimento de interesse, data da consulta.
- Ordenada da mais recente para a mais antiga, com paginação.
- Mesma tela para o cliente logado, para o parceiro com painel liberado e para a visão interna "Ver como cliente".

## Limites de requisição da API (1.000 req/5 min, pico de 200/5s, por conta)

- **429 (Too Many Requests):** espera e tenta de novo automaticamente. Respeita o tempo indicado pela API (Retry-After); sem indicação, espera crescente de 5s, 15s e 45s, até 3 tentativas por chamada. Persistindo o bloqueio, para com "Falha ao sincronizar: limite de requisições do app Elora atingido, tente novamente em alguns minutos" — sem perder progresso.
- **Pausa entre páginas:** 500ms entre chamadas da paginação (~2 páginas/s, muito abaixo do pico). Conta com 10.000 contatos (100 páginas) leva ~1 minuto.
- **Retomada após interrupção:** dois marcadores separados. O "ponto de busca" avança conforme cada página é gravada (contato gravado por código único, sem duplicar); a "última sincronização" exibida na tela só atualiza quando a varredura completa termina. Se parar no meio, a próxima tentativa retoma do ponto salvo — nunca recomeça do zero nem fica presa sem atualizar a data.
- A chamada de campos personalizados é uma requisição única, irrelevante para o limite.

## Regras de acesso

Mesmo padrão já aprovado para os snapshots de uso:

- Nova tabela `elora_contatos_sincronizados` (cliente_id, contact_id, nome, telefone, criado_em, utm_source, utm_medium, utm_campaign, procedimento_interesse, data_consulta, sincronizado_em), com `GRANT SELECT` para `authenticated`, `GRANT ALL` para `service_role`, nada para `anon`; único por (cliente_id, contact_id).
- Policies somente de leitura: `contatos_select_interno` = `is_equipe_interna()`; `contatos_select_cliente` = `cliente_id = cliente_do_usuario()`; `contatos_select_parceiro` = `parceiro_pode_ver_painel(cliente_id)`.
- Nenhuma policy de INSERT/UPDATE/DELETE para `authenticated`: a gravação é exclusiva da função de sincronização, que já exige sessão autenticada + `is_equipe_interna()` antes de tocar a credencial de serviço.
- O mapeamento fica em duas colunas novas na própria `elora_integracao_contas` (`campo_procedimento_key`, `campo_data_consulta_key`) — tabela sem GRANT para logins comuns, mesmo nível da chave de API.

## Detalhes técnicos

- Migração aditiva: cria `elora_contatos_sincronizados` (com GRANTs antes de RLS e policies) e adiciona as duas colunas de mapeamento, ambas nulas.
- Toda a lógica nova entra em `src/lib/integracao-elora.functions.ts`, reaproveitando `requireSupabaseAuth` + `exigirEquipeInterna` e a camada única `lerApiElora` (estendida para POST com corpo JSON e paginação). Sem segundo caminho de autorização.
- Leitura do painel: nova função de servidor que resolve o cliente pelo mesmo caminho já usado em `getPainelCliente` e consulta a tabela com a sessão do usuário (RLS aplicada), retornando apenas os campos da tabela — nenhum dado de custo, margem ou chave.
- Nomes técnicos da API tratados só no servidor: `GET /v1/contact/custom-field?NestedList=false` e `POST /v1/contact/filter` com `createdAt.after`, `includeDetails: ["CustomFields"]`, `pageSize: 100`, paginando por `pageNumber` até `hasMorePages` falso; datas sempre em UTC. A tela nunca depende do formato do fornecedor.
- `src/integrations/supabase/types.ts` regenerado após a migração.

## Testes e validação

- Teste automatizado no padrão de `painel-cliente-rls.test.ts`: cliente vê só os próprios contatos; parceiro vê apenas com vínculo e painel liberado; usuário sem vínculo não vê nada; a tabela de chaves segue invisível.
- Sincronizar duas vezes seguidas e confirmar que a contagem não dobra.
- Conferir "% vindos de anúncio" contra a contagem manual de contatos com anúncio no período.
- Celular, tablet e computador, temas claro e escuro; build e a suíte de testes íntegros.
