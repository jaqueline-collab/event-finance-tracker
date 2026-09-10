# Menu de gestão de volta, cor financeira única, novo endereço e salvar do perfil

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

## 3. Uma cor só para destaque financeiro (sua diretriz)

O problema real: hoje existe uma cor central amarela **e** vários amarelos escritos à
mão espalhados no código (lucro, margem, badges, status "Pendente", custos, descontos).
Por isso a cor nunca muda "geral".

Correção:

- Criar **uma variável nova e única**, dedicada a destaque financeiro, definida uma
  única vez no arquivo de cores: **azul no tema claro, amarelo no tema escuro**.
- Ela não reaproveita a cor de destaque do painel (que serve outros fins) e não se
  chama "alerta" — ela existe só para valor financeiro.
- **Eliminar todo amarelo escrito à mão** em Clientes, Financeiro, Fechamento Mensal,
  Dashboard e Área do cliente, fazendo todos esses pontos lerem a variável única.
- Resultado: trocar a cor no futuro é mudar uma linha num arquivo só, e propaga para
  todas as telas. Marca e site institucional não mudam.
- Validação: buscar `yellow-` nos arquivos do painel e confirmar zero ocorrência; abrir
  as quatro telas nos dois temas conferindo que a cor é idêntica em todas.

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
- `src/styles.css`: novos tokens `--fin` / `--fin-foreground` (claro: azul alinhado a
  `--primary`; escuro: amarelo atual `oklch(0.91 0.19 104)`), registrados em
  `@theme inline` como `--color-fin`, gerando `text-fin`/`bg-fin`.
- Substituir em `src/routes/clientes.tsx`, `financeiro.tsx`, `resumo.tsx`,
  `dashboard.tsx` e `src/routes/area-do-cliente.tsx` todo uso de `text-accent`/`bg-accent`
  financeiro e todo `yellow-500/600/700` hardcoded por `text-fin`/`bg-fin`; `--accent`
  volta a ser neutro (usos não financeiros não mudam de cor).
- `src/routes/perfil.tsx`: `salvar()` com `Promise.race` de 20s, erro exibido via toast;
  investigar a resposta real de `salvarMeuPerfil` (RLS/upsert em `perfis`) com sessão
  autenticada e corrigir o que aparecer.
- Validação final: `bun run tsgo` + build; busca por `yellow-` com zero resultado nos
  arquivos do painel; com sessão real conferir `/clientes` (menu presente),
  `/area-do-cliente` (sem menu), redirecionamento de `/cliente`, salvar perfil com foto
  e as telas nos dois temas com cor idêntica.
