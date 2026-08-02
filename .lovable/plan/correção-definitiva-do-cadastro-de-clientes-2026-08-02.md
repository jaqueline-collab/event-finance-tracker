# Correção definitiva do cadastro de clientes

## Diagnóstico confirmado

- O botão possui `try/catch/finally`; portanto o estado visual só pode permanecer em “Salvando...” enquanto `addCliente()` continua pendente.
- `addCliente()` ainda grava diretamente pelo cliente do navegador. Esse caminho depende da sessão interna antes de enviar o `INSERT`, e o snapshot de rede desta ocorrência não contém requisição para `elora_clientes`, indicando que a espera acontece antes de o banco receber o cadastro.
- O projeto ainda registra **dois middlewares de autenticação** em `src/start.ts`: `attachSupabaseAuth`, que instancia o cliente gerado com a trava padrão, e `attachConfiguredAuth`, que instancia o cliente configurado. Isso contradiz o comentário de “apenas um cliente” e reintroduz exatamente a concorrência de sessão que as correções anteriores pretendiam remover.
- Os prazos atuais protegem a promessa externa, mas não tornam a operação atômica: cliente e setup são dois `INSERTs` independentes no navegador. Além disso, um `Promise.race` rejeitado não cancela necessariamente o trabalho interno que ficou pendente.

## Plano de correção

1. **Eliminar a duplicidade de autenticação**
   - Manter um único cliente e um único middleware de autenticação.
   - Remover o caminho gerado que volta a criar o cliente com a trava padrão.
   - Garantir que root, login, store e chamadas protegidas compartilhem a mesma fonte de sessão.

2. **Tirar o cadastro do caminho frágil do navegador**
   - Criar uma função de servidor autenticada específica para cadastrar cliente e setup.
   - Validar os campos recebidos e usar o usuário autenticado no servidor, sem chamar `getSession()` dentro do salvamento.
   - Fazer os dois registros no backend com IDs previamente definidos e respostas verificadas; não alterar nem excluir dados existentes.

3. **Dar prazo real e cancelável à operação**
   - Aplicar `AbortSignal` explícito à chamada do formulário, em vez de depender apenas de `Promise.race`.
   - Garantir que timeout encerre a operação e devolva erro ao `finally` do botão.
   - Distinguir falha de autenticação, falha no cliente, falha no setup e timeout, sem toast duplicado.

4. **Preservar consistência e recuperação**
   - Atualizar a store somente após confirmação do cadastro.
   - Se o cliente for confirmado e o setup falhar, manter o cliente salvo e informar claramente a pendência, sem rollback destrutivo.
   - Tornar nova tentativa idempotente para evitar cliente duplicado depois de um timeout aparente.

5. **Validar no fluxo real**
   - Testar com a sessão real em uma única aba: cadastrar cliente, confirmar o `INSERT`, recarregar e conferir cliente + setup.
   - Repetir com duas abas e com requisição artificialmente atrasada; o botão deve sempre sair de “Salvando...” dentro do prazo.
   - Conferir console e rede para garantir uma única inicialização do cliente de autenticação e nenhuma chamada pendente.

## Limites

- Nenhum cliente, movimento, lançamento ou fechamento existente será alterado ou excluído.
- A mudança ficará restrita ao transporte/autenticação do cadastro e ao feedback do formulário.
