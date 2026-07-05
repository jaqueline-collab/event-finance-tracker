## Objetivo

Manter o botão amarelo atual apontando para `app.eloracrm.com.br` (só renomear pra deixar claro que é "ir para"), e adicionar um acesso separado **"Área do parceiro"** que leva pra rota interna `/auth` deste app.

## Mudanças em `src/routes/index.tsx`

### 1. Navbar (linha ~83–121)

- **Botão amarelo (linha 110–117)**: mantém `href="https://app.eloracrm.com.br/"`, `target="_blank"`. Troca o texto **"Entrar"** por **"Elora App"** com um ícone `ArrowUpRight` (lucide) do lado, deixando claro que é link externo.
- **Menu de navegação (linha 96–109)**: adiciona um novo item `<Link to="/auth">Área do parceiro</Link>` como último link do menu, no mesmo estilo dos outros (`hover:text-landing-yellow`). Fica discreto, ao lado de "Contato".

### 2. CTAs internos "Entrar" (linhas 189 e 492)

Esses dois botões estão dentro da própria LP (hero/planos). Preciso confirmar contigo o comportamento deles — hoje ambos dizem "Entrar" e provavelmente vão pro mesmo link externo. Duas opções:

- **(a)** deixo iguais ao botão da navbar: rótulo **"Elora App"** apontando pro `app.eloracrm.com.br` externo.
- **(b)** transformo em **"Área do parceiro"** apontando pro `/auth` interno.

Meu palpite é **(a)** pra manter consistência com a navbar, mas te confirmo antes de mexer.

### 3. Footer (opcional)

Adiciono um link textual pequeno **"Área do parceiro"** → `/auth` no footer, como segundo ponto de acesso.

## O que NÃO muda

- Nenhuma lógica de auth, rotas protegidas, permissões ou cálculo.
- Landing continua pública, `/auth` continua sendo a porta de entrada do app interno.

## Confirmação

- Os dois "Entrar" internos (linhas 189, 492) seguem o **botão amarelo (Elora App externo)** ou viram **Área do parceiro (/auth interno)**?
