# Diagnóstico "sessao-travada" e plano de correção

## O que confirmei lendo o código (fatos, não hipóteses)

1. **Existem DOIS clientes de autenticação vivos no mesmo navegador.**
   - `src/integrations/supabase/client-configured.ts` (o novo, com trava por aba de 4s)
   - `src/integrations/supabase/client.ts` (o gerado), usado por `src/integrations/supabase/auth-attacher.ts`
   - `src/start.ts` registra os **dois**: `functionMiddleware: [attachSupabaseAuth, attachConfiguredAuth]`.

   Os dois usam a **mesma chave do localStorage**, mas a trava nova (`boundedTabLock`) é uma fila em memória **por módulo**. Cada cliente tem a sua própria fila, então eles **não se serializam entre si**: podem renovar o token ao mesmo tempo. O refresh token é de uso único, então um deles falha e o auth-js entra em espera/retentativa. A correção nº 2 não cobre esse caso por construção.

2. **A trava nova limita a ESPERA pela vez, mas não limita a OPERAÇÃO.**
   Em `client-configured.ts` o timeout de 4s vale só para "esperar a vez na fila". Assim que a vez chega, `operation()` roda **sem limite de tempo**. Um refresh pendurado na rede segura a fila e tudo o que vem depois espera — até o timeout de 8s do `getAuthUid()` disparar. É exatamente o sintoma relatado: não trava mais "pra sempre", mas dá "sessao-travada" **sempre**.

3. **O app dispara refresh de sessão com muita frequência.**
   `src/routes/__root.tsx` chama `supabase.auth.refreshSession()` a cada `focus`, a cada `visibilitychange` e a cada 30 min. Cada volta para a aba (é o que a usuária faz antes de clicar em "Salvar") inicia um refresh que ocupa a trava.

4. **`getSession()` é a porta de entrada de tudo**: `store.ts` (todos os saves), `permissions.ts`, `__root.tsx`, `auth.tsx`, `auth.callback.tsx` e os dois attachers. Basta a trava ocupada por um refresh lento para **todos** os botões falharem juntos.

## Por que os dois consertos anteriores não resolveram

- **Timeout de 8s no `getAuthUid`**: é alarme, não conserto. Troca "trava eterna" por "erro em 8s"; a causa continua intacta.
- **Trava por aba de 4s**: resolve o cenário de *Web Lock órfã de outra aba*, que **não é** o cenário real. O teste travou uma Web Lock de propósito; o problema real acontece **dentro da mesma aba**, com dois clientes concorrendo e um refresh de rede sem prazo. Cenário de teste diferente do real — por isso "passou" no teste e falha no uso.

## Ambiente de teste x navegador da usuária

- No teste: `localhost`, rede rápida, sessão recém-criada — refresh quase nunca é necessário e nunca demora.
- No uso real: token perto de expirar, rede instável, aba em segundo plano (o navegador congela timers e requisições de abas ocultas), várias abas do preview e do site publicado abertas, e possíveis extensões de bloqueio atrasando a chamada de rede.

## Passo 1 — Instrumentação (o que preciso que você me mande)

Adiciono logs temporários com carimbo de tempo, prefixo `[auth-debug]`, em:
- entrada/saída de `getAuthUid()` (início, retorno, timeout);
- `boundedTabLock`: pedido de trava, trava obtida, trava liberada, timeout de espera, duração da operação;
- `refreshSession()` do `__root.tsx` (início/fim/erro);
- aviso quando mais de um cliente de autenticação for criado na mesma página.

**Como reproduzir:** abrir o app em **uma única aba**, abrir o Console (F12), deixar a aba em segundo plano por ~1 minuto, voltar e clicar em "Salvar Cliente" até o erro aparecer. Copiar **todas** as linhas `[auth-debug]` e me enviar — elas mostram, com tempos reais, quem segurava a trava e por quanto tempo.

## Passo 2 — Correção (aplico após confirmar pelos logs)

1. **Um único cliente de autenticação**: remover `attachSupabaseAuth` de `src/start.ts`, deixando só `attachConfiguredAuth`.
2. **Prazo também para a operação dentro da trava** (não só para a espera): passou de ~5s, abandona e libera a fila.
3. **Timeout de rede no cliente Supabase**: `fetch` próprio com `AbortController` (~10s), para refresh pendurado falhar rápido.
4. **Salvar sem depender de `getSession()`**: guardar o `user_id` em memória via `onAuthStateChange` (já roda no `__root.tsx`) e usá-lo nos saves. Se o token estiver expirado, quem avisa é o banco, com erro claro.
5. **Reduzir o refresh agressivo**: sair do refresh a cada `focus`/`visibilitychange`, mantendo o refresh automático do próprio Supabase.
6. **Remover os logs temporários** após a confirmação.

Nenhum dado existente é alterado — a mudança é só de autenticação/UX.

## Em português simples

Dois "porteiros" diferentes mexiam na mesma chave de sessão ao mesmo tempo, e a fila que criamos só organizava a entrada — não havia limite de quanto tempo alguém podia ficar lá dentro. Quando a renovação da sessão travava na rede (aba em segundo plano, internet oscilando), ela segurava a porta e todo clique em "Salvar" esperava até estourar o tempo. A correção tira o porteiro duplicado, coloca prazo para quem entra, dá prazo para a chamada de rede e faz o salvar usar a identidade já conhecida em vez de pedir a chave de novo a cada clique.