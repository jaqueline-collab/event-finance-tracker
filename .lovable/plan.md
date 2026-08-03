# Corrigir menus laterais sumidos e layout do formulário de Planos

## Diagnóstico confirmado

**1. Menus laterais vazios (causa raiz encontrada)**
- No banco, `jaqueline@eloracrm.com.br` está com `is_admin = true` e `user_id` preenchido corretamente.
- Porém as tabelas `app_users` e `app_user_permissions` **não têm nenhum GRANT** para os papéis `authenticated`/`service_role` (consulta em `information_schema.role_table_grants` retornou vazio). Sem GRANT, a API de dados nega a leitura mesmo com RLS correta.
- Resultado: em `src/lib/permissions.ts`, a leitura de `app_users` falha, `isAdmin` vira `false` e a lista de permissões fica vazia — então `AppSidebar` filtra todos os itens e a sidebar aparece só com "Gestão" e "Configurações".
- Agravante: enquanto `access.loading` é `true`, a sidebar já renderiza vazia, e qualquer erro é engolido no `catch`, sem aviso na tela.

**2. Formulário de Planos desconfigurado**
- O formulário de criar/editar plano é um `Card` inline dentro da página (`src/routes/planos.tsx`, bloco `{open && (...)}`), com dezenas de campos empilhados.
- Ao abrir a edição, a página cresce, o conteúdo passa por baixo do cabeçalho fixo (`header` sticky do `__root.tsx`) e os títulos de seção ficam cortados, exatamente como no print.

## Implementação

1. **Liberar acesso às tabelas de usuários/permissões**
   - Migração adicionando os GRANTs faltantes em `app_users` e `app_user_permissions` para `authenticated` (SELECT/INSERT/UPDATE/DELETE) e `service_role`, mantendo as políticas RLS atuais intactas.
   - Nenhum dado é alterado ou removido.

2. **Tornar a falha visível e não destrutiva na sidebar**
   - Enquanto as permissões carregam, mostrar itens em estado de carregamento em vez de lista vazia.
   - Se a leitura falhar, exibir um aviso discreto ("não foi possível carregar suas permissões") em vez de esconder tudo silenciosamente.

3. **Reorganizar o formulário de Planos**
   - Converter o bloco inline em um modal (Dialog) com largura ampla, corpo rolável e rodapé fixo com "Cancelar" / "Salvar plano".
   - Reagrupar em seções claras (Tipo do plano, Dados comerciais, Ciclo de faturamento, Franquias incluídas, Preços de venda, Custos operacionais, Parceiros), com grade consistente e espaçamento uniforme.
   - Manter toda a lógica de cálculo, validação, `saving` e persistência atual sem alteração.

## Validação

- Recarregar a aplicação logada e confirmar que Dashboard, Clientes, Fechamento Mensal, Financeiro, Funil aparecem em Gestão e Planos/Parceiros/Usuários em Configurações.
- Consultar novamente os GRANTs para confirmar que estão aplicados.
- Abrir "Novo Plano" e "Editar" um plano existente e confirmar que nada fica sob o cabeçalho e que o salvamento continua funcionando.
