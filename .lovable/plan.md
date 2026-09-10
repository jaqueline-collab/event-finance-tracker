# Perfil que salva, visão 360 do cliente e cores do painel

## 1. Perfil: botões travados (causa provável identificada)

Na sua tela, tanto "Trocar foto" quanto "Salvar alterações" aparecem apagados ao
mesmo tempo. Os dois dependem do mesmo sinal interno de "ainda carregando a sessão",
e esse sinal só é desligado quando a leitura da sessão responde. Se essa leitura fica
pendurada, os dois botões ficam mortos para sempre — foi exatamente o que a imagem
mostra. Ainda não confirmei com um login real, então o primeiro passo é confirmar.

Correções:
- Nunca deixar os botões dependerem da sessão: eles só desligam durante a própria
  ação (enviando foto / salvando).
- Prazo máximo para a leitura da sessão; passou disso, a tela libera assim mesmo.
- O envio da foto passa a usar o identificador do usuário direto da sessão, não do
  perfil carregado, então "Sessão não carregada" deixa de aparecer.
- Toda falha vira mensagem visível em português (nunca mais botão sem reação).
- Teste final: enviar foto, salvar nome e telefone, recarregar e confirmar que ficou.

## 2. Troca de e-mail com código de confirmação

Hoje a troca só dispara um link para o novo e-mail. Passa a ser em duas etapas:

1. Você pede a troca; enviamos um código de 6 dígitos para o e-mail **atual**.
2. Você digita o código na própria tela; só depois disso a troca é solicitada e o
   novo e-mail recebe o link final de confirmação.

Assim ninguém troca o e-mail de acesso sem ter a caixa de entrada atual em mãos.

## 3. Botão "Ver como cliente" no seu perfil

No seu perfil (só para a equipe interna) entra um seletor com a lista de clientes e o
botão **Ir para a Área do Cliente**. Ele abre a área real do cliente escolhido, em modo
somente leitura, com faixa fixa no topo avisando que é visualização. Nada de segundo
login. É o mesmo caminho já usado no "Ver como parceiro": mesmas funções de servidor,
mesmos limites de dados — nunca custo, margem ou lucro.

## 4. Cores: menos amarelo, mais azul

O amarelo hoje domina a tabela de clientes (lucro, margem, valores extras) e destaques
do painel. Troco esses realces por tons de azul da identidade, mantendo o amarelo só
como detalhe pontual (marca e um ou outro badge). Também reviso o bloco "Acessos à Área
do Cliente" para o mesmo tom de azul.

## Parte técnica

- `src/hooks/use-perfil.ts`: `carregando` deixa de bloquear ações; timeout na leitura de
  sessão; expor `userId` vindo de `session.user.id`.
- `src/routes/perfil.tsx`: `disabled` só por `salvando`/`enviando`; upload usa o id da
  sessão; erros de `getMeuPerfil`/`salvarMeuPerfil` exibidos.
- Troca de e-mail: `signInWithOtp` (sem criar usuário) para o e-mail atual +
  `verifyOtp` type `email`; só com sucesso chama `supabase.auth.updateUser({ email })`.
- Nova server function em `src/lib/cliente.functions.ts`: `listarClientesParaVer`
  (somente `is_equipe_interna()`, devolve id e nome). O botão navega para
  `/cliente?como=<id>`; `getPainelCliente` já aceita `verComoClienteId` restrito a
  equipe interna.
- Cores: substituir `text-yellow-*` / `bg-yellow-500/20` em `src/routes/clientes.tsx`,
  `dashboard.tsx` e `RankingTable.tsx` por tokens semânticos de azul já existentes em
  `src/styles.css`; ajustar `src/components/acessos-cliente.tsx`.
- Validação: `bun run tsgo`, build, e teste autenticado da gravação do perfil.
