# Movimentos travados: diagnóstico e correção

## Respostas às suas perguntas (verificadas no código)

1. **Não.** `addMovimento()` em `src/lib/store.ts` (linhas 512-527) continua no caminho antigo do navegador: chama `getAuthUid()` e depois `supabase.from("elora_movimentos").insert(...)` direto pelo cliente do navegador. Não usa função de servidor nem `gravarComPrazo` — ou seja, **sem prazo algum**: se a chamada ficar pendurada, o botão fica "carregando" para sempre.

2. **Confirmado.** `addCliente()` (linhas 460-470) já foi migrado: usa a função de servidor autenticada `cadastrarClienteComSetup` com prazo de 20s. `addMovimento()` não foi. Isso explica exatamente o padrão: cadastro de cliente novo funciona; upgrade, downgrade e churn travam.

3. **Sim, o patch pós-movimento tem o mesmo problema.** Depois de inserir o movimento, `addMovimento()` faz `supabase.from("elora_clientes").update(...)` pelo navegador (linhas 570-573), também sem prazo. E `updateCliente()` (linhas 494-498) ainda chama `requireAuthUid()` + update pelo navegador — mesma via frágil, usada pela troca de status e edição de cliente.

## Correção proposta

1. **Nova função de servidor autenticada `registrarMovimento`**
   - Arquivo fino `src/lib/movimentos.functions.ts` (só a declaração) + `src/lib/movimentos.schemas.ts` com a validação Zod, no mesmo padrão de `clientes.functions.ts`.
   - Recebe: o movimento completo e o patch já calculado do cliente.
   - No servidor: insere o movimento (upsert idempotente por `id`, sem sobrescrever nada existente) e, na sequência, aplica o patch em `elora_clientes` — os dois com `user_id`/sessão vindos do middleware, nunca de `getSession()` do navegador.
   - Retorna confirmação separada de cada etapa (`movimentoSalvo`, `clienteAtualizado`, erro de cada uma).

2. **`addMovimento()` passa a chamar essa função**
   - Cálculo dos deltas (upgrade/downgrade somam, setup substitui) continua exatamente como está hoje — a lógica de negócio não muda.
   - Envolvida em `gravarComPrazo(..., 20000)`: o botão sempre sai do "carregando", com mensagem clara em caso de timeout.
   - Estado local (Zustand) só é atualizado **após** confirmação do banco. Se o movimento gravar e o patch do cliente falhar, o movimento é mantido e o aviso é explícito — sem rollback destrutivo.

3. **Mesmo tratamento para `updateCliente()`**
   - Passa pela mesma função de servidor (modo "somente patch"), eliminando a última via que depende de `getSession()` no navegador para gravar cliente.

4. **Cobertura de todos os tipos**: setup, upgrade, downgrade, churn e addon usam o mesmo caminho — churn continua gravando `data_churn` via patch.

## Teste antes de considerar resolvido

- Criar um cliente de teste descartável e aplicar nele: upgrade (+2 usuários), downgrade (-1 usuário) e churn.
- Conferir no banco: linha em `elora_movimentos` e campos atualizados em `elora_clientes`.
- Recarregar a tela e confirmar que os três aparecem.
- Apagar apenas esse cliente de teste e seus movimentos ao final.

## Limites

- **Nada de Fischer, ZAYN, Ospina ou qualquer cliente/movimento real será tocado.**
- Nenhum fechamento, lançamento financeiro ou histórico é alterado.
- A mudança fica restrita ao transporte/autenticação da gravação de movimentos e ao feedback da tela.
