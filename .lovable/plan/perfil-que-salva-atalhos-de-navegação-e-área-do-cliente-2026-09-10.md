# Perfil que salva, atalhos de navegação e Área do Cliente

## 1. Corrigir "salvar" e "trocar foto" no perfil

Verifiquei o banco: a tabela de perfis existe, as permissões e as regras de acesso
(cada pessoa só lê/grava o próprio registro) estão corretas, o espaço de fotos existe
com as regras certas — e a tabela está vazia, ou seja, nenhum salvamento chegou.
Como as permissões estão certas, a causa ainda **não está confirmada**; ela está no
caminho entre a tela e o servidor. Então o primeiro passo é reproduzir com uma sessão
real logada e ler a mensagem de erro exata.

Suspeita principal a testar primeiro: hoje o app registra dois anexadores de token de
acesso ao mesmo tempo, e é exatamente esse tipo de duplicidade que já travou
salvamentos neste projeto antes. Se for isso, fica só um.

Depois de identificado, o conserto inclui:
- Mensagem de erro visível na tela (nunca mais botão que não faz nada).
- Salvar o perfil pelo mesmo caminho já usado nos módulos que funcionam.
- Envio da foto com erro traduzido em português e prévia imediata.
- Teste final logado: enviar foto, salvar nome/telefone, recarregar e confirmar que ficou.

## 2. Atalhos de navegação

- No topo do site, quando a pessoa estiver logada, aparece o item fixo **Meu painel**
  ao lado de Parceiros / Blog / Perguntas frequentes (além da bolinha do perfil).
  O destino segue o papel: dono → painel de controle, parceiro → área do parceiro,
  cliente → área do cliente.
- Dentro do painel, no menu lateral, entra o item **Site**, que leva de volta à
  página inicial do site.

## 3. Área do Cliente

Acesso: você cadastra o e-mail da pessoa dentro do cadastro do cliente (igual ao que
já existe para parceiros). Quem entra com esse e-mail cai direto na área do cliente.

Telas da área do cliente, com o mesmo visual do site (preto, azul-marinho, amarelo vivo,
claro/escuro):

- **Minha conta**: plano atual, data de ativação, canais/usuários/contatos disponíveis
  e o que está incluso. Sem custos, margem ou lucro — nunca.
- **Histórico**: linha do tempo de upgrades e downgrades da conta, com data e o que mudou.
- **Novidades (release)**: lista de publicações que você cria num painel único do lado
  interno, escolhendo para quais clientes cada novidade aparece.
- **Minha equipe**: o cliente cadastra pessoas da equipe dele para acessarem a mesma área.
- **Resultados**: painel de indicadores já montado, hoje com estado "em breve" e
  preparado para receber dados de uma API externa depois.
- Botão fixo **Acessar o aplicativo**, levando para o app.eloracrm.com.br.

Do seu lado (painel de controle): dentro de cada cliente, aba para liberar e-mails de
acesso; e uma tela nova de **Novidades** para publicar releases e escolher os destinatários.

## Parte técnica

- Diagnóstico com Playwright em sessão autenticada real; leitura da resposta HTTP da
  função de servidor de perfil. Provável remoção de um dos dois `functionMiddleware`
  em `src/start.ts` (`attachSupabaseAuth` + `attachConfiguredAuth`).
- Novas tabelas: `elora_cliente_usuarios` (cliente_id, email, nome, user_id, ativo),
  `elora_releases` (título, conteúdo, publicado_em) e `elora_release_destinos`
  (release_id, cliente_id) — com GRANTs e RLS: cliente só lê o próprio cliente e as
  releases direcionadas a ele; equipe interna administra tudo.
- Funções `cliente_do_usuario()` e `is_cliente()` (security definer), no mesmo padrão de
  `parceiro_do_usuario()`.
- `src/lib/cliente.functions.ts` com server functions autenticadas devolvendo apenas
  campos seguros (sem custo/margem/lucro), reaproveitando os cálculos já existentes.
- Novas rotas `/cliente` (com abas) e `/novidades` (interno); roteamento por papel em
  `src/routes/__root.tsx` estendido para clientes, e `usePapelUsuario` passa a devolver
  também `clienteId`.
- Bloco de "Resultados" isolado numa camada de dados própria, para trocar o mock por
  chamada de API depois sem mexer na tela.

## Entrega em duas etapas
1. Correção do perfil + atalhos de navegação (rápido, valida hoje).
2. Área do Cliente completa + painel de novidades.
