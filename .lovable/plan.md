# Endereço da API por serviço + dashboard "Resultados" com rótulos configuráveis

## Parte A — Causa do erro nos painéis (confirmada)

Sim, sua leitura está certa. Existe um único ponto que monta a URL: `lerApiElora(baseUrl, apiKey, caminho)` faz literalmente `baseUrl + caminho`, e todas as chamadas passam o mesmo "Endereço da conta" salvo (`https://api.wts.chat/core`). Painéis viravam `.../core/v2/panel`, que não existe — e a recusa foi lida como "a conta recusou o acesso".

Testei agora na conta real e confirmei o que responde onde:

- `/core/v1/contact/...` e `/core/v1/tag` → 200 (contatos, campos personalizados, etiquetas)
- `/crm/v2/panel` → 200 (3 painéis, com etapas)
- `/chat/v1/sequence` → 200 (1 sequência)
- `/chat/v2/session` → 200 (1.099 conversas)
- `/v1/user` → não responde em nenhum dos três prefixos (404/acesso negado). O filtro de usuários fica indisponível até essa permissão ser liberada na conta; a tela avisa em vez de dar erro.

### Correção e migração

1. "Endereço da conta" passa a guardar só o domínio raiz (`https://api.wts.chat`), com placeholder e explicação novos.
2. Ao salvar, o sistema remove sozinho `/core`, `/crm` ou `/chat` do fim e barras sobrando.
3. Cada chamada declara seu serviço e o prefixo é acrescentado internamente (contatos/campos/etiquetas → `/core`; painéis → `/crm`; sequências e conversas → `/chat`).
4. Migração automática das contas já salvas: `jvu3dzqk` passa de `https://api.wts.chat/core` para `https://api.wts.chat`. `oxi9byp0` guarda `https://app.eloracrm.com.br` (endereço do site, não da API) e está desligada — fica como está e a tela avisa que não é endereço de API; você reconfigura quando ativar. Nada de reconfiguração manual nas demais.
5. Segurança para contas antigas: a raiz também é normalizada em tempo de execução, então nada quebra antes da migração.

## Parte B — O que confirmei antes de mexer no dashboard

- `timeWait` e `timeService` vêm como duração `HH:MM:SS`, com horas podendo passar de 24 (ex.: `25:52:20`, `64:08:46`). Muitos vêm nulos. A média vai ignorar nulos e mostrar quantas conversas entraram no cálculo.
- `firstResponseAt` vem em data/hora UTC e também é nulo com frequência. O tempo médio de primeira resposta usa `timeWait` (que é exatamente essa espera) e cai para `firstResponseAt − startAt` quando `timeWait` faltar.
- `contactId` vem direto em cada conversa — sem chamada extra por conversa para cruzar com o contato e calcular "% de anúncio".
- Nesta conta, nenhuma das 1.099 conversas tem classificação preenchida. A equipe ainda não classifica atendimentos, então a descoberta virá vazia e o aviso previsto ("Nenhuma classificação encontrada — reconfigure quando a equipe começar a classificar") será o que você verá até isso mudar. Blocos e gráficos ligados a rótulo mostram zero, com essa explicação.

## Parte C — Classificação em três camadas

- **Descoberta** (mantém): varredura de amostra grava cada valor bruto encontrado.
- **Rotulagem** (nova, na página de mapeamento): você cria rótulos com nome livre e associa vários valores brutos a cada um. Lista de rótulos, cada um expansível mostrando os valores vinculados, botão "Novo rótulo" (nome + seleção múltipla dos valores descobertos). Editar e excluir rótulo disponíveis.
- **Uso** (nova): cada peça do dashboard tem seu próprio seletor de rótulo, sem amarração fixa.

## Parte D — Dashboard "Resultados"

Primeira linha, 4 blocos de largura igual:

1. **Novos Contatos** — contagem do período, com "27 de 162 contatos — 17%" em texto menor.
2. **[rótulo escolhido]** — conversas do período cuja classificação cai no rótulo, com o mesmo texto menor de anúncio, calculado pelos contatos daquelas conversas.
3. **[rótulo escolhido]** — idêntico ao 2, com seletor próprio.
4. **Conversas Realizadas** — renomeia "Conversas com resposta", mesma lógica atual.

Segunda linha: "Tempo médio de primeira resposta" e "Tempo médio de atendimento", exibidos como `Xh Ymin`, com a contagem de conversas consideradas.

Ranking de campanhas: mesma agregação, agora com coluna de posição (1, 2, 3…), até 20 linhas, sem campanha fora.

Dois gráficos de coluna mês a mês (últimos 12 meses), duas séries cada, barras lado a lado. Cada série tem seletor próprio de rótulo — nenhum nome fixo. A legenda usa o nome do rótulo escolhido.

Configuração: seção "Configurar blocos e gráficos" na página de mapeamento (`/clientes/{id}/integracao-elora`), com os seis seletores (bloco 2, bloco 3, gráfico 1 séries 1 e 2, gráfico 2 séries 1 e 2).

## Parte E — Modelo de dados

Mesmo padrão de acesso já aprovado (GRANT `SELECT` para `authenticated`, `ALL` para `service_role`, nada para `anon`; RLS interna/cliente/parceiro; sem escrita para logins comuns):

- `elora_classificacoes_descobertas` (cliente_id, valor_bruto, sincronizado_em), único por (cliente_id, valor_bruto)
- `elora_classificacoes_rotulos` (id, cliente_id, nome, criado_em)
- `elora_classificacoes_rotulo_valores` (rotulo_id, valor_bruto), único por par
- `elora_conversas_classificadas` ganha colunas novas e nulas: `contato_id`, `first_response_at`, `time_wait_segundos`, `time_service_segundos` (duração já convertida em segundos na gravação, para média correta acima de 24h)
- `elora_integracao_contas` ganha `bloco2_rotulo_id`, `bloco3_rotulo_id`, `grafico1_serie1_rotulo_id`, `grafico1_serie2_rotulo_id`, `grafico2_serie1_rotulo_id`, `grafico2_serie2_rotulo_id`

Migração aditiva única, sem remover nada; as duas colunas de classificação antigas (`classificacao_consulta_agendada`, `classificacao_procedimento_vendido`) deixam de ser usadas mas permanecem.

## Detalhes técnicos

- `lerApiElora` ganha um parâmetro de serviço (`core` | `crm` | `chat`); a raiz é normalizada na gravação e na leitura.
- `sincronizarConversasCliente` passa a gravar `contato_id`, `first_response_at` e as duas durações convertidas (`HH:MM:SS` → segundos, tolerando nulo e formato inesperado, que vira nulo em vez de zero) e a registrar cada `categoryName` novo em `elora_classificacoes_descobertas`.
- `getResultadosCliente` passa a resolver rótulo → conjunto de valores brutos e a agregar por esse conjunto; as séries mensais e as médias saem da mesma consulta, agregadas no servidor.
- Gráficos com Recharts, `--chart-2`/`--chart-1`, respeitando tema claro e escuro; nada de cor fixa.
- Novas funções de servidor para criar, editar, excluir e listar rótulos e para salvar a configuração das peças, todas com `requireSupabaseAuth` + `is_equipe_interna()`; a chave de API nunca sai do servidor.
- `types.ts` regenerado após a migração.

## Validação

- Conta `jvu3dzqk` com o endereço migrado: testar conexão, campos, painéis, sequências, etiquetas e conversas respondendo; usuários mostrando o aviso de permissão.
- Dois rótulos agrupando valores brutos distintos e conferência de que a contagem soma os dois.
- Blocos 2 e 3 apontando para rótulos diferentes, cada um com contagem e % de anúncio próprios.
- Gráficos com séries diferentes, conferindo mês a mês.
- Tempos médios conferidos à mão contra 3–5 conversas.
- Sincronizar duas vezes sem duplicar; celular, tablet e computador, temas claro e escuro; testes de acesso e build íntegros.
