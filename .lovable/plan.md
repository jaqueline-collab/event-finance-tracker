# Correção: Financeiro preso em "Carregando…"

Somente correção de carregamento. Nenhum valor, permissão ou cálculo muda. Parte 2 não começa.

## O que muda

**1. `src/lib/permissions.ts` (`useCurrentUserAccess`)**
- Estado inicial vem do cache `elora.access.cache.v1` (lido após hidratação, no primeiro efeito). Com cache: `loading=false` de imediato e a rede atualiza em segundo plano.
- `setLoading(true)` só na primeira leitura (ref `primeiraLeitura`). `refresh` e `onAuthStateChange` recarregam em segundo plano, sem voltar `loading` para true.
- `onAuthStateChange`: ignora `TOKEN_REFRESHED`, `INITIAL_SESSION` e qualquer evento cujo e-mail seja igual ao último carregado. Recarrega só em mudança real (SIGNED_IN de outro e-mail, SIGNED_OUT, USER_UPDATED).
- Guarda contra leituras simultâneas: se uma leitura já está em andamento, reaproveita a mesma promessa.
- Regra de decisão "deve mostrar loading?" extraída para uma função pura testável.

**2. `src/routes/financeiro.tsx`**
- Ref `jaCarregou`: "Carregando…" só aparece antes da primeira leitura concluída. Depois disso, abas e conteúdo ficam montados com as últimas permissões conhecidas.
- Redirecionamento para a primeira aba permitida continua igual, só que usa `jaCarregou` em vez de `access.loading`.

**3. Falha sem cache**
- Se a leitura falhar e não houver cache: estado "Sem acesso" mostrando `access.error` e botão "Tentar de novo" (chama `access.refresh`). Nunca carregando infinito.

**4. Testes**
- Novo `src/lib/__tests__/permissions-loading.test.ts`: depois da primeira leitura concluída, a regra nunca devolve `loading=true` (refresh, eventos de auth, erro); e eventos TOKEN_REFRESHED/INITIAL_SESSION do mesmo e-mail não disparam recarga.
- Rodar a suíte inteira.
- Conferência no navegador (preview, sessão ativa): `/financeiro`, `?aba=lancamentos`, `?aba=notas` e `/resumo`, com recarga em cada um, medindo que "Carregando…" some em menos de 2s. O site publicado só reflete a correção depois de publicar; aviso isso no fim, se não puder conferir lá.

## Arquivos
- `src/lib/permissions.ts`
- `src/routes/financeiro.tsx`
- `src/lib/__tests__/permissions-loading.test.ts` (novo)
