# Menu de gestão de volta, cores por tema, novo endereço e salvar do perfil

## 1. Menu lateral sumiu na sua tela de Clientes (causa encontrada)

A regra que esconde o menu foi escrita como "endereço começa com /cliente". Sua página
de gestão é **/clientes** — também começa com "/cliente", então o menu sumiu junto e o
título passou a dizer "Área do cliente" na sua tela.

Correção: esconder o menu **apenas** na visualização do cliente e na do parceiro, com
comparação exata. Suas telas de gestão voltam a ter Dashboard, Clientes, Fechamento
Mensal, Financeiro, Funil e Configurações.

## 2. Novo endereço da área do cliente

A área do cliente passa a ser **eloracrm.com.br/area-do-cliente** (hoje `/cliente`).
Quem abrir o endereço antigo é levado automaticamente para o novo, então nenhum link
já enviado quebra. A visualização como cliente vira
`/area-do-cliente?como=<cliente>`.

## 3. Cores: amarelo só no tema escuro, azul no tema claro

O amarelo vem de uma cor central do painel (o "acento") que hoje é amarela nos dois
temas — é ela que pinta lucro, margem, badges, valores e ícones.

- No **tema escuro** (fundo preto) o amarelo fica como está.
- No **tema claro** (fundo branco) essa cor passa a ser o azul da identidade.
- Os amarelos escritos à mão (status "Pendente" e custos no Financeiro, descontos e
  badges do Fechamento Mensal) passam a seguir a mesma regra: azul no claro, amarelo
  no escuro.
- A marca (marquinha do EloraCRM) e o site institucional continuam como estão.

## 4. Salvar do perfil travado em "Salvando..."

A foto sobe, mas o botão fica girando. A gravação do perfil é a única ação da tela sem
prazo máximo: se a chamada não responde, o botão fica preso para sempre e nenhuma
mensagem aparece. Ainda não confirmei o motivo da chamada não responder, então:

1. Primeiro passo é reproduzir com login real e ver o erro exato da gravação.
2. Colocar prazo máximo (como já existe no envio da foto) e sempre mostrar mensagem
   em português quando falhar — nunca mais botão girando sem resposta.
3. Corrigir a causa que aparecer no teste e confirmar salvando nome, telefone e foto,
   recarregando a página para ver que ficou.

## Parte técnica

- `src/routes/__root.tsx`: `semMenuLateral` e o rótulo do topo passam a usar igualdade
  exata em vez de `startsWith`; `areaPropria` aponta para `/area-do-cliente`.
- Renomear `src/routes/cliente.tsx` para `src/routes/area-do-cliente.tsx`; criar
  `src/routes/cliente.tsx` como redirecionamento (`beforeLoad` → `redirect`) preservando
  o parâmetro `como`. Atualizar links em `perfil.tsx` e `acessos-cliente.tsx`.
- `src/styles.css`: `--accent` / `--accent-foreground` em `:root` passam para azul
  (alinhado a `--primary`); `.dark` mantém o amarelo atual.
- Trocar `yellow-500/600/700` fixos em `src/routes/financeiro.tsx` e `src/routes/resumo.tsx`
  por um par de tokens novos (`--warning` claro=azul / escuro=amarelo) registrados em
  `@theme inline`.
- `src/routes/perfil.tsx`: `salvar()` com `Promise.race` de 20s, erro exibido via toast;
  investigar a resposta real de `salvarMeuPerfil` (RLS/upsert em `perfis`) com sessão
  autenticada e corrigir o que aparecer.
- Validação: `bun run tsgo` + build; com sessão real conferir `/clientes` (menu presente),
  `/area-do-cliente` (sem menu), redirecionamento de `/cliente`, salvar perfil com foto e
  as telas em tema claro sem amarelo.
