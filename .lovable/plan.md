# Relatório: integração atual com a API do Elora (nada será alterado)

Aprovar ou pular este cartão não muda nada no app.

## 1. Onde fica o token de cada cliente
- Tabela `elora_integracao_contas`, coluna **`api_key`** (texto em claro), uma linha por cliente (`cliente_id`), junto com `base_url` (domínio raiz, ex. https://api.wts.chat), `ativo`, `ultima_sync`, `ultimo_erro`, mapeamentos e filtros.
- Proteção (confirmada agora no banco): RLS ligado com uma única regra, `integracao_contas_service_only`, e **nenhum GRANT** para usuários logados ou anônimos. Ou seja, nenhum login (nem equipe, nem cliente, nem parceiro) lê a tabela diretamente; só o servidor com a credencial de serviço.
- A chave não é criptografada no banco; a proteção é só de acesso. Na tela ela aparece mascarada (`chaveMascarada`) e só pode ser substituída.

## 2. Função que devolve token + conexão por cliente
- Existe, mas é **interna, não exportada**: `contaDoCliente(clienteId)` em `src/lib/integracao-elora.functions.ts` (~linha 857). Lê a linha de `elora_integracao_contas` com acesso privilegiado e devolve `{ conta, supabaseAdmin }`.
- Não há checagem de permissão dentro dela: quem chama precisa ter feito `exigirEquipeInterna` antes (todas as funções públicas fazem `requireSupabaseAuth` + `exigirEquipeInterna`).
- Várias funções mais antigas (`testarIntegracaoCliente`, `listarCamposPersonalizados`, `sincronizarIntegracaoCliente`, `getIntegracaoCliente`) repetem a mesma consulta à mão em vez de usar `contaDoCliente`.
- Nenhuma função de servidor devolve o token para o navegador — e não deve devolver. Para uma automação externa, o caminho seguro seria uma rota pública com verificação própria que usa `contaDoCliente` do lado do servidor.

## 3. Lista de clientes "prontos para uso"
- **Não existe** lista nem flag pronta. Há só peças soltas:
  - `ativo` (liga/desliga manual);
  - `ultimo_erro` (preenchido pelo "Testar conexão" ou por falha de sincronização);
  - `ultima_sync` (última sincronização de contatos concluída);
  - `campo_procedimento_key` / `campo_data_consulta_key` (mapeamento).
- O "Testar conexão" não grava um "testado com sucesso em"; só limpa ou grava o erro.
- Situação atual no banco: **2 contas cadastradas** — 1 ativa, mapeada, sincronizada e sem erro; 1 desligada, sem mapeamento, nunca sincronizada e com erro registrado.
- Uma regra razoável para o relatório diário seria `ativo = true AND ultimo_erro IS NULL` (e, se exigir dados já sincronizados, `ultima_sync IS NOT NULL`) — isso é sugestão, não existe hoje.

## 4. O que `lerApiElora` cobre
- `lerApiElora(baseUrl, apiKey, servico, caminho, {metodo, corpo})` é **genérica**: aceita qualquer caminho em `core`, `crm` ou `chat`, GET ou POST com corpo, com tempo-limite, 3 novas tentativas em "limite de requisições" (respeita Retry-After) e mensagens de erro em português. Não é amarrada aos widgets.
- Endpoints efetivamente usados hoje:
  - **Contatos:** `core /v1/contact/filter` (paginado, desde data) e `core /v1/contact/custom-field`.
  - **Conversas:** `chat /v2/session` com `IncludeDetails=ClassificationDetails` — usado em `sincronizarConversasCliente` (grava em `elora_conversas_classificadas`, com tempo de espera/atendimento e se teve resposta) e em `listarClassificacoesRecentes` (últimos 90 dias, até 5 páginas).
  - **Classificação de atendimento:** não há endpoint de catálogo na API; as categorias vêm dentro de cada conversa (`categoryName`). O sistema descobre os nomes pelas conversas e guarda em `elora_classificacoes_descobertas`; os agrupamentos ficam em `elora_classificacoes_rotulos` / `_rotulo_valores`.
  - **Etiquetas (tags de contato):** `core /v1/tag` (`listarEtiquetasCliente`) — usado só como filtro, não sincronizado em tabela.
  - Também: `crm /v1/panel`, painel/custom-fields, `/v1/sequence`, `core /v1/user`.
- Limitação: `sincronizarIntegracaoCliente` e `sincronizarConversasCliente` exigem sessão de equipe interna logada; não podem ser chamadas por uma automação externa como estão.

## 5. Obsoleto, quebrado ou nunca usado (apenas listado)
- **`elora_uso_snapshots`**: tabela da migração 0006 que nenhum código grava ou lê — só aparece no teste de RLS.
- **Colunas antigas em `elora_integracao_contas`**: `classificacao_consulta_agendada` e `classificacao_procedimento_vendido` não são usadas em lugar nenhum; `bloco2/bloco3_rotulo_id` e `grafico1/2_serie1/2_rotulo_id` são do Dashboard Resultados fixo anterior ao construtor de widgets e só aparecem em código de compatibilidade.
- **Funções exportadas sem nenhum uso na tela:** `salvarMapeamentoCliente` e `getConfigDashboardCliente`.
- **Mapeamento de contatos em duas camadas:** o botão "Sincronizar contatos" (cadastro do cliente) ainda exige Procedimento/Data da consulta mapeados, mas a tela atual de Configurar API já trabalha com campos personalizados livres e sincronização seletiva por widget — a exigência sobrou do desenho antigo.
- **Duas telas para a mesma coisa:** `/configurar-api?cliente=` e `/clientes/$id/integracao-elora` renderizam o mesmo componente.
- **Quebrado de fora:** `core /v1/user` responde "acesso negado" em todas as contas (permissão da chave no app Elora) — filtro por usuário fica inutilizável.
- **Sem agendamento:** as duas sincronizações são só manuais.
- **Consultas repetidas** da conta (item 2) em vez de uma só função.
- `filtro_campanha` gravado, mas **não confirmado** se algum widget aplica esse filtro na leitura.

## Pontos para decidir antes de desenhar o relatório diário
1. Se a automação externa vai chamar o EloraCRM (rota pública com segredo compartilhado) ou se o próprio EloraCRM vai chamar a API do Elora num horário agendado — no segundo caso, `lerApiElora` + `contaDoCliente` já servem.
2. Criar um marcador explícito de "pronto" (ex. `testado_ok_em`) ou usar a regra `ativo + sem erro`.
3. Se vale limpar os itens do item 5 antes de construir.
