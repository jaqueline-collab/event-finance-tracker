# Trazer de volta o menu do painel e trocar o amarelo por azul

## 1. Menu lateral sumiu na sua tela de Clientes (causa encontrada)

A regra que esconde o menu lateral foi escrita como "endereço começa com /cliente".
Só que a sua página de gestão é **/clientes** — ela também começa com "/cliente", então
o menu sumiu junto. O mesmo vale para o título no topo, que passou a dizer
"Área do cliente" na sua tela de Clientes.

Correção: esconder o menu **apenas** na visualização do cliente (`/cliente`) e na do
parceiro (`/parceiro`), com comparação exata — nunca em `/clientes`,
`/gestao-parceiros` ou qualquer outra tela sua de gestão.

Resultado: você volta a ver Dashboard, Clientes, Fechamento Mensal, Financeiro, Funil,
Configurações etc. em todas as suas telas. Só quando você entra em "ver como cliente"
o menu some, que é o comportamento certo.

## 2. Amarelo vira azul em todo o painel

O amarelo não está espalhado por acaso: existe uma cor central do painel (o "acento")
que hoje é amarela, e é ela que pinta lucro, margem, badges, ícones e valores nas telas
de Clientes, Financeiro, Fechamento Mensal, Dashboard e Área do cliente.

- Troco essa cor central de amarelo para o azul da identidade (claro e escuro), o que
  já corrige de uma vez todos os destaques dos três prints.
- Troco também os amarelos escritos à mão que sobram: status "Pendente" e custos no
  Financeiro, descontos e badges do Fechamento Mensal.
- Ajusto o tom para continuar legível nos dois temas (claro e escuro).
- O amarelo continua só onde é marca/site: a marquinha do EloraCRM e a página inicial
  e login do site institucional ficam como estão.

## Parte técnica

- `src/routes/__root.tsx`: `semMenuLateral` e o rótulo do topo passam a usar igualdade
  exata (`pathname === "/cliente" || pathname === "/parceiro"`) em vez de `startsWith`.
- `src/styles.css`: `--accent` / `--accent-foreground` em `:root` e `.dark` passam do
  amarelo (`oklch(0.91 0.19 104)`) para azul alinhado a `--primary`.
- Substituir `yellow-500/600/700` por tokens azuis em `src/routes/financeiro.tsx` e
  `src/routes/resumo.tsx`; manter `landing-yellow*` em `index.tsx`, `auth.tsx`,
  páginas do site e `EloraMark`.
- Validação: `bun run tsgo` + build, e conferir com sessão real `/clientes` (menu
  presente), `/cliente?como=<id>` (sem menu) e ausência de amarelo nas três telas dos prints.
