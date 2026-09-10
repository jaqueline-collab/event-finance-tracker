# Continuar logado no site + área de perfil com foto

## O que muda para quem usa

### 1. Continuar logado ao voltar para o site
Hoje o acesso já fica guardado no navegador, mas as páginas do site (Início, Parceiros, Blog, Perguntas frequentes) sempre mostram o botão "Logar", como se ninguém estivesse conectado.

Passa a ser assim, para donos, parceiros e clientes:
- Se a pessoa já entrou, o topo do site mostra a bolinha com a foto dela (ou as iniciais do nome), no lugar de "Logar".
- Ao clicar na bolinha: nome e e-mail, atalho para o painel dela (painel de controle, área do parceiro ou área do cliente, conforme o caso), "Editar perfil" e "Sair".
- Quem não entrou continua vendo "Logar" normalmente.

### 2. Bolinha de perfil dentro do sistema
No topo direito das telas internas, o e-mail em texto dá lugar à mesma bolinha com foto ou iniciais, com o mesmo menu (Editar perfil / Sair). O botão de sol/lua continua onde está.

### 3. Página "Editar perfil"
Nova página acessível por qualquer pessoa que entrou (dono, parceiro, cliente), com:
- Foto: enviar uma imagem, ver a prévia e trocar ou remover.
- Nome de exibição.
- Telefone.
- E-mail de acesso: mostrado, e com opção de solicitar troca — a alteração só vale depois que a pessoa confirmar pelo link enviado no novo e-mail.
- Botão salvar com aviso de sucesso ou erro.

As iniciais usadas na bolinha vêm do nome; sem nome, das primeiras letras do e-mail.

## Parte técnica

- Nova tabela `public.perfis` (`user_id` único, `nome`, `telefone`, `avatar_url`, timestamps), com GRANTs para `authenticated`/`service_role` e políticas de RLS restritas a `auth.uid()` — cada pessoa lê e edita apenas o próprio registro.
- Novo bucket de storage `avatars` (público para leitura), com políticas de upload/atualização/remoção limitadas à pasta `"<user_id>/..."` da própria pessoa.
- `src/lib/perfil.functions.ts`: server functions `getMeuPerfil` e `salvarMeuPerfil` com `requireSupabaseAuth`, seguindo o padrão já usado em `parceiro.functions.ts`. Upload do arquivo pelo cliente do navegador direto no bucket; a função salva apenas a URL.
- `src/hooks/use-perfil.ts` (ou similar): carrega sessão + perfil e expõe `{ session, perfil, iniciais, destinoPainel }`, com cache leve em `localStorage` no mesmo padrão de `use-papel.ts`, para o topo não piscar.
- Novo componente `src/components/UserMenu.tsx` (avatar + `DropdownMenu` do shadcn) usado nos dois lugares: `Navbar` em `src/components/landing/SiteChrome.tsx` e o header autenticado em `src/routes/__root.tsx`.
- `Navbar` passa a ser sensível à sessão: lê a sessão via o hook e alterna entre "Logar" e `UserMenu`. Continua renderizando na hora, sem bloquear a página pública enquanto a sessão carrega.
- Nova rota `src/routes/perfil.tsx` (fora das rotas públicas institucionais, portanto já protegida pelo guard de sessão do `__root.tsx`), com `head()` próprio.
- Sair reaproveita o fluxo já existente (`supabase.auth.signOut()` + ida para `/auth`).
- Troca de e-mail usa `supabase.auth.updateUser({ email })`, que dispara a confirmação por e-mail.
- Nada muda na lógica de papéis: o destino do atalho "Meu painel" reusa `usePapelUsuario` (interno → `/dashboard`, parceiro → `/parceiro`).

## Observação
A "área do cliente" ainda não existe como tela no sistema. Neste trabalho, o menu de perfil de um cliente aponta para a área do parceiro/painel conforme o papel atual; a área do cliente entra depois, quando for construída.
