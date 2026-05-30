## O que vou fazer

### 1. Olhinho para mostrar/ocultar senha
Em `src/routes/auth.tsx`, adicionar um botão dentro do campo de senha com ícone `Eye` / `EyeOff` (lucide-react) que alterna o `type` do input entre `password` e `text`.

### 2. Traduzir todas as mensagens de erro do Supabase Auth para PT-BR
Criar um helper `src/lib/auth-errors.ts` que mapeia as mensagens em inglês do Supabase para português. Exemplos:

- `Invalid login credentials` → "Email ou senha incorretos"
- `User already registered` → "Este email já está cadastrado"
- `Password should be at least 6 characters` → "A senha deve ter no mínimo 6 caracteres"
- `Email not confirmed` → "Email ainda não confirmado"
- `Email rate limit exceeded` → "Muitas tentativas. Aguarde alguns minutos"
- `Password is known to be weak and easy to guess` → "Esta senha é muito comum. Escolha uma mais forte"
- `Unable to validate email address` → "Email inválido"
- `Network request failed` → "Falha de conexão. Verifique sua internet"
- fallback: mensagem genérica em PT

Aplicar esse helper em `src/routes/auth.tsx` no `catch` do submit.

### 3. Revisar e traduzir textos da interface
Garantir que toda a UI de autenticação e mensagens de toast estão em português:
- Tela de login (`auth.tsx`): labels, placeholders, botões, mensagens de sucesso
- Header do app (`__root.tsx`): tooltip do botão Sair, mensagem "Carregando..."
- Toasts de sucesso após login/signup

### 4. Validações do formulário em PT
Mensagens nativas de validação HTML (required, minLength) costumam vir do navegador, mas vou adicionar validação manual em JS com mensagens em português antes do submit, para garantir consistência.

## Arquivos afetados

- `src/lib/auth-errors.ts` (novo) — mapa de tradução de erros
- `src/routes/auth.tsx` — olhinho na senha + uso do tradutor + textos PT revisados
- `src/routes/__root.tsx` — revisar textos em PT (já está quase tudo, só conferir)

## Fora de escopo

- Não vou mexer no fluxo de login (continua email + senha conforme você confirmou)
- Não vou criar recuperação de senha agora (você não pediu nesta mensagem)
- Outras telas do app (clientes, planos, etc.) já estão em PT — só vou tocar se encontrar algo em inglês