# Dash como construtor de widgets + tela "Configurar API"

## Resposta antes de implementar: o que acontece com os dados já sincronizados

Conferi os dados reais: existem 419 contatos sincronizados (todos do cliente Dr. Gean Brustolin) e **nenhum deles tem "procedimento de interesse" ou "data da consulta" preenchidos** — as duas colunas estão 100% vazias. Ou seja, na prática não há nada a perder.

Mesmo assim, a migração não descarta nada: ela copia automaticamente qualquer valor existente nessas duas colunas para dentro do novo campo `campos_personalizados`, usando a chave técnica salva no mapeamento do cliente. Nada depende de ressincronização.

As duas colunas antigas continuam existindo no banco (a plataforma não permite apagar colunas em uso), apenas deixam de ser lidas e gravadas.

## 1. Navegação

- Novo item no menu lateral, logo abaixo de "Clientes": **Configurar API**, em `/configurar-api`.
- No topo da tela, um seletor com busca de cliente (mesma lista já usada nas outras telas). Escolhido o cliente, carrega exatamente o conteúdo de hoje: endereço, chave, descoberta de campos/painéis/sequências/classificações, filtros — e a nova seção "Meu Dash".
- `/clientes/{id}/integracao-elora` continua funcionando e passa a redirecionar para `/configurar-api?cliente={id}`; o botão "Configurar mapeamento e filtros" no cadastro do cliente aponta para o mesmo lugar. Uma implementação só.
- Acesso pelo mesmo módulo de permissão de "Clientes" (quem edita cliente, configura API).

## 2. Campos como fontes de dados

- A busca de campos personalizados passa a listar **todos** os campos da conta (nome + chave técnica), sem limite de dois e sem seletores fixos.
- Painéis, campos de painel, sequências, etiquetas, usuários e classificações (rótulos) ficam igualmente disponíveis como fontes; nada fica pré-atribuído a um lugar do painel.
- Os dois seletores "Procedimento de interesse" / "Data da consulta" somem da tela.

## 3. Construtor de widgets ("Meu Dash")

Seção na tela Configurar API, com "Adicionar widget" e os tipos:

- **Bloco métrico** — número + rótulo, com percentual e volume opcionais de um segundo critério.
- **Gráfico de pizza** — uma dimensão categórica (origem, classificação, campanha) e a contagem por categoria.
- **Gráfico de barras** — simples (uma série) ou combinado (duas ou mais séries, lado a lado ou empilhadas, cada uma com fonte e filtro próprios).
- **Calendário** — visão mensal tipo agenda; cada item com data vira evento no dia. Várias camadas simultâneas (ex.: "Data da consulta" e "Data do procedimento"), cada uma com cor, rótulo e liga/desliga na visualização.

Cada widget tem: título livre, tipo, fonte de dados (contatos, conversas ou classificações), campo(s) usados, filtros próprios (usuários, etiquetas, campo personalizado, etapa do funil, campanha) e posição.

Adicionar, editar, reordenar (subir/descer e arrastar) e remover, sem widget obrigatório. Prévia do widget na própria tela de configuração.

O Dash da área do cliente renderiza exatamente esses widgets, na ordem definida.

## 4. Migração do que já existe

Para cada cliente com integração configurada, a migração cria os widgets equivalentes ao painel atual, na mesma configuração: Novos contatos, os dois blocos de rótulo configurados, Conversas realizadas, os tempos médios, os dois gráficos de coluna e o ranking de campanhas. Quem já usa não vê diferença ao abrir; a partir daí pode editar, remover ou acrescentar.

## 5. Sincronização seletiva

- Antes de cada sincronização o sistema resolve quais chaves de campo personalizado são usadas por algum widget **daquele cliente** e grava apenas essas.
- Widget novo com campo novo: a partir da próxima sincronização o campo passa a ser gravado (não retroage, salvo ressincronização completa).
- UTM continua sempre gravado, por ser campo nativo do contato — o ranking de campanhas como widget não depende de seleção.

## 6. Modelo de dados

- `elora_contatos_sincronizados`: nova coluna `campos_personalizados jsonb` (`{"chave": "valor"}`), com backfill das duas colunas antigas. As colunas `procedimento_interesse` e `data_consulta` permanecem no banco, sem uso.
- Nova tabela `elora_dashboard_widgets` (id, cliente_id, tipo, titulo, configuracao jsonb, ordem, criado_em, atualizado_em), com o padrão de acesso já aprovado: `GRANT SELECT` para usuários autenticados, `GRANT ALL` para o serviço, nada para anônimo; RLS de leitura por `is_equipe_interna()`, `cliente_do_usuario()` e `parceiro_pode_ver_painel(cliente_id)`; gravação só pelas funções de servidor com trava de equipe interna.
- `elora_classificacoes_rotulos`, painéis e sequências continuam como estão, agora referenciados pelo `configuracao` dos widgets.
- As colunas fixas de dashboard em `elora_integracao_contas` (`bloco2_rotulo_id`, `bloco3_rotulo_id`, as quatro de série e as duas de mapeamento) deixam de ser lidas após a migração e ficam no banco sem uso.

## Detalhes técnicos

- Migração aditiva única: coluna jsonb + backfill + tabela de widgets (GRANTs antes de RLS/policies) + inserção dos widgets padrão derivados da configuração atual de cada integração.
- Funções de servidor novas em `src/lib/integracao-elora.functions.ts`, reaproveitando `requireSupabaseAuth` + `exigirEquipeInterna`: listar, salvar, reordenar e excluir widgets; `getResultadosCliente` passa a devolver os dados por widget em vez da estrutura fixa.
- `src/components/resultados-cliente.tsx` vira um renderizador por tipo de widget; calendário em componente próprio (mês navegável, camadas coloridas).
- Nova rota `src/routes/configurar-api.tsx` com o seletor de cliente; a rota antiga vira redirecionamento.
- `src/integrations/supabase/types.ts` regenerado.

## Validação

- Um widget de cada tipo numa conta de teste (métrico, pizza, barra simples, barra combinada, calendário com duas camadas) conferindo os números.
- Remover um widget e confirmar que o campo correspondente deixa de ser gravado na próxima sincronização, sem afetar os demais.
- Conferir que os widgets migrados aparecem iguais ao painel atual.
- Reordenar e confirmar que a ordem persiste na área do cliente.
- Celular, tablet e computador, temas claro e escuro.
- Testes de segurança da tabela nova (cliente vê só os próprios widgets, parceiro só com vínculo e painel liberado, ninguém de fora lê ou grava), somados aos 30 já existentes.
