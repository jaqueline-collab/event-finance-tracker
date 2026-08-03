# Corrigir salvamentos travados em todos os módulos

## Diagnóstico confirmado

- `src/start.ts` registra simultaneamente `attachSupabaseAuth` e `attachConfiguredAuth`, embora o próprio comentário do arquivo determine que apenas o cliente configurado deve existir. O attacher gerado chama `getSession()` em um segundo cliente e reintroduz a disputa de sessão que já causou os travamentos anteriores.
- Planos ainda usa gravações diretas pelo navegador em `addPlano`, `updatePlano` e `removePlano`. Essas operações não usam a função de servidor autenticada aplicada a Clientes, Movimentos e geração de Fechamentos, nem envolvem a consulta inteira com o prazo já disponível na store.
- O banco está com RLS habilitado, políticas por usuário e permissões CRUD corretas para `elora_planos`, `elora_parceiros`, `elora_descontos` e `elora_financeiro`; portanto, o problema atual não é falta de permissão.
- O mesmo padrão vulnerável permanece em Parceiros, Financeiro, Descontos, exclusões/edições auxiliares de Clientes e Movimentos, manutenção de Fechamentos, Oportunidades e Usuários/Permissões.

## Implementação

1. **Eliminar o conflito global de autenticação**
   - Remover o import e o registro de `attachSupabaseAuth` em `src/start.ts`.
   - Manter somente `attachConfiguredAuth`, que usa o token em memória e não chama `getSession()` durante cada gravação.
   - Auditar todo `src/` para confirmar que o cliente gerado e o attacher gerado não são importados por código ativo.

2. **Migrar Planos para uma função de servidor autenticada**
   - Criar schema de entrada para criar, editar e excluir planos.
   - Criar uma Server Function fina, protegida por `requireSupabaseAuth`, que injeta `user_id`, aplica timeout em cada consulta e relê o registro após criar/editar para confirmar persistência real.
   - Alterar a store para chamar essa função com prazo externo, atualizar o Zustand somente depois da confirmação e propagar erro específico para o toast.
   - Preservar o formulário e o estado `saving`, garantindo desbloqueio no `finally` em sucesso, erro ou timeout.

3. **Aplicar o mesmo padrão aos demais módulos de gravação**
   - Migrar Parceiros, Financeiro, Descontos e Oportunidades para funções de servidor autenticadas e com confirmação de persistência.
   - Migrar as operações diretas restantes de Clientes/Movimentos e manutenção de Fechamentos para o mesmo limite de tempo e regra “banco primeiro, UI depois”.
   - Migrar Usuários/Permissões para função autenticada com verificação administrativa no servidor antes de qualquer alteração.
   - Remover atualizações otimistas e chamadas “fire-and-forget” que hoje podem exibir dados não persistidos ou engolir erros.

4. **Padronizar falhas visíveis e recuperáveis**
   - Toda ação de salvar/editar/excluir terá timeout finito, mensagem contextual e erro propagado.
   - Nenhum botão ficará eternamente em “Salvando...”.
   - Nenhum toast de sucesso será exibido antes da releitura que confirma o registro no banco.

## Validação

- Criar um plano descartável pela mesma função usada pela tela, confirmar sua existência no banco, editar, confirmar novamente, excluir e confirmar a remoção.
- Repetir um CRUD descartável nos módulos seguros migrados, sem tocar nos dados existentes nem em fechamentos reais.
- Recarregar a aplicação para confirmar que os registros persistidos reaparecem e que registros removidos não voltam.
- Simular timeout/erro e verificar que o spinner encerra e o toast explica a etapa que falhou.
- Executar busca final em todo `src/` e reportar as ocorrências de `attachSupabaseAuth`, import do cliente gerado e gravações diretas restantes; o objetivo é zero uso ativo fora dos arquivos auto-gerados que não são importados.