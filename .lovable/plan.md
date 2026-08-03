# Correções: permissões do menu lateral + formulário de Planos

## Correção importante do diagnóstico anterior

A consulta em `information_schema.role_table_grants` retornou vazio, mas isso é um falso negativo: essa view só mostra grants visíveis ao papel que consulta. Ao ler os privilégios reais (`pg_class.relacl`), **todas as 13 tabelas** — incluindo `app_users` e `app_user_permissions` — já têm privilégios completos para `anon`, `authenticated` e `service_role`.

Conclusão: **não há GRANT faltando em nenhuma tabela**. A migração de GRANTs sai do plano; a verificação extra pedida já está feita e o resultado é "nenhuma lacuna".

Tabelas verificadas: app_users, app_user_permissions, elora_clientes, elora_custos, elora_custos_wts, elora_descontos, elora_fechamento_itens, elora_fechamentos, elora_financeiro, elora_kanban_cards, elora_movimentos, elora_parceiros, elora_planos.

## Causa real do menu vazio

A leitura de permissões (`useCurrentUserAccess`) faz `getSession()` com timeout de 8s. Quando a trava de sessão do navegador atrasa essa chamada, ou quando a consulta a `app_users` falha, o código cai no `catch` e força `isAdmin = false` com lista de permissões vazia — sem avisar nada. Resultado: os títulos "Gestão" e "Configurações" aparecem sem nenhum item, exatamente como no print.

## O que será feito

### 1. Leitura de permissões resiliente
- Se `getSession()` estourar o tempo, tentar identificar o usuário pelo id já em cache na sessão do app.
- Tratar erros das consultas explicitamente (hoje são ignorados).
- Guardar o último acesso bem-sucedido e reaproveitá-lo em caso de falha, em vez de zerar tudo.
- Expor um estado de erro para a interface.

### 2. Menu lateral
- Mostrar itens em estado de carregamento (esqueleto) enquanto as permissões carregam.
- Se a leitura falhar, exibir aviso discreto com botão "Tentar novamente", em vez de lista vazia.
- Se não houver nenhum módulo liberado e não houver erro, mostrar texto explicativo.

### 3. Formulário de Planos em modal
- Mover o formulário inline para um `Dialog` com cabeçalho fixo, corpo rolável e rodapé com Cancelar / Salvar.
- Manter as seções atuais (Tipo do Plano, Dados Comerciais, Ciclo, Franquias, Módulos Opcionais, Preços, Parceiros).
- Nenhuma alteração em cálculo, validação ou persistência.

## Validação
Recarregar logada e confirmar Dashboard, Clientes, Fechamento Mensal, Financeiro e Funil em Gestão, e Planos/Parceiros/Usuários em Configurações; abrir e editar um plano no modal sem sobreposição com o cabeçalho.
