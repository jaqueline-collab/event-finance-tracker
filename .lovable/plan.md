# Corrigir “Gerar Fechamento” preso em carregamento

## Diagnóstico confirmado

- O clique chega a `enviarParaFinanceiro()` e ativa `gerandoFechamento`, mas a gravação ainda segue pelo caminho antigo do navegador.
- `addLancamento()` insere diretamente em `elora_financeiro` sem timeout.
- Depois, `addFechamento()` insere diretamente em `elora_fechamentos` e `elora_fechamento_itens`, também sem timeout. Qualquer uma dessas requisições pendente mantém o botão em “Gerando…”.
- O fluxo não usa uma função de servidor autenticada, ao contrário dos cadastros de cliente e movimento já corrigidos.
- `src/start.ts` ainda registra `attachSupabaseAuth` e `attachConfiguredAuth` juntos. O primeiro chama `getSession()` no cliente gerado antigo; portanto, os dois clientes de autenticação continuam ativos, apesar do comentário no arquivo afirmar que existe apenas um.
- A gravação atual não é atômica: o lançamento financeiro é criado antes do fechamento. Se a etapa seguinte falhar ou travar, pode sobrar um lançamento sem fechamento vinculado.
- O `finally` da tela está correto, mas só executa quando as Promises terminam ou rejeitam; hoje elas podem permanecer pendentes indefinidamente.

## Implementação

1. **Criar uma função de servidor autenticada para gerar o fechamento completo**
   - Validar com Zod o fechamento, seus itens e os lançamentos financeiros.
   - Usar a identidade validada pelo middleware para preencher `user_id` e `criado_por`.
   - Gravar lançamentos, fechamento e itens no servidor, com timeout explícito em cada consulta.
   - Retornar IDs e confirmação de persistência; nunca retornar sucesso apenas porque a chamada foi iniciada.

2. **Garantir consistência entre as etapas**
   - Se uma etapa falhar, remover somente os registros criados por aquela tentativa, verificando o resultado da compensação.
   - Não alterar, substituir ou excluir fechamentos e lançamentos já existentes.
   - Preservar os dois modos atuais: consolidado e por cliente.

3. **Migrar o botão para o novo caminho**
   - `enviarParaFinanceiro()` fará uma única chamada à função de servidor, protegida por um limite total de tempo.
   - Atualizar Zustand e fechar o modal somente depois da confirmação real do banco.
   - Em timeout ou erro, sempre liberar “Gerando…”, manter o formulário aberto e mostrar uma mensagem específica.
   - Impedir duplo clique e tentativas duplicadas com IDs idempotentes gerados antes da chamada.

4. **Eliminar o cliente de autenticação duplicado**
   - Remover `attachSupabaseAuth` da lista de middlewares e manter apenas `attachConfiguredAuth`, que usa o token já armazenado em memória e não chama `getSession()` durante a gravação.

5. **Validar sem afetar dados reais**
   - Testar com um fechamento descartável identificável.
   - Confirmar no banco a correspondência exata: lançamento(s), um fechamento e todos os itens vinculados.
   - Recarregar a página para confirmar persistência.
   - Excluir somente os registros do teste após a validação.
   - Conferir que erro/timeout encerra o spinner e não deixa registros parciais.

## Limites

- Nenhum fechamento existente será recalculado, editado ou apagado.
- Nenhum lançamento financeiro anterior será alterado.
- A lógica de valores, MAU, descontos, datas e seleção de clientes permanece igual; muda apenas o transporte e a segurança da persistência.