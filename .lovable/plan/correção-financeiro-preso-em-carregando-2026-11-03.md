# Correção: Financeiro preso em "Carregando…"

Somente correção de carregamento. Nenhum valor, permissão ou cálculo muda. Parte 2 não começa.

## O que muda

**1. `src/lib/permissions.ts` (`useCurrentUserAccess`)**
- Estado inicial vem do cache `elora.access.cache.v1` (lido no primeiro efeito, após hidratação), mas só é aplicado se o e-mail da sessão atual for igual ao e-mail guardado no cache. Com cache válido: `loading=false` de imediato e a rede atualiza em segundo plano.
- `setLoading(true)` só na primeira leitura. `refresh` e `onAuthStateChange` recarregam em segundo plano, sem voltar `loading` para true.
- `onAuthStateChange`: ignora `TOKEN_REFRESHED`, `INITIAL_SESSION` e eventos com o mesmo e-mail já carregado. Em `SIGNED_OUT`: apaga o cache e zera acesso.
- Leituras simultâneas reaproveitam a mesma promessa.
- Falha com cache válido (mesmo e-mail): usa o cache e mantém `access.error` preenchido.
- Regras ("mostrar loading?", "usar cache?", "evento recarrega?") extraídas como funções puras testáveis.

**2. `src/routes/financeiro.tsx`**
- Ref `jaCarregou`: "Carregando…" só antes da primeira leitura concluída. Depois, abas e conteúdo ficam montados com as últimas permissões conhecidas.
- Com erro e acesso vindo do cache: aviso discreto acima das abas com o texto do erro e "Tentar de novo".

**3. Falha sem cache**
- Estado "Sem acesso" mostrando `access.error` e botão "Tentar de novo". Nunca carregando infinito.

**4. Testes**
- Novo `src/lib/__tests__/permissions-loading.test.ts`: loading nunca volta para true após a primeira leitura; cache só vale para o mesmo e-mail; TOKEN_REFRESHED/INITIAL_SESSION do mesmo e-mail não recarregam; SIGNED_OUT limpa o cache.
- Rodar a suíte inteira e conferir no preview `/financeiro`, `?aba=lancamentos`, `?aba=notas` e `/resumo` com recarga (menos de 2s).

**5. Publicar**
- Verificar a varredura de segurança, publicar e depois abrir eloracrm.com.br/financeiro para confirmar que a nova versão está no ar (a parte com sessão no site publicado pode exigir sua conferência).

## Arquivos
- `src/lib/permissions.ts`
- `src/routes/financeiro.tsx`
- `src/lib/__tests__/permissions-loading.test.ts` (novo)
