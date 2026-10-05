# Auditoria interativa e comparação de fechamentos na Área do Parceiro

Esta parte só lê dados e mostra na tela. Nenhum fechamento é alterado. Vale a mesma regra da auditoria em PDF: só parceiros com permissão de ver valores, sem custo, margem, lucro, WTS ou desconto de escala.

## 1. Auditoria na tela
- Cada fechamento ganha um botão **"Ver auditoria"**, ao lado do download da auditoria. Ele só aparece com a permissão de valores.
- O botão abre uma janela grande (em tela cheia no celular) com:
  - **Resumo da carteira**: clientes, bruto, desconto e líquido, com o total no fim.
  - **Lista de clientes com busca**: cada cliente abre a composição da mensalidade (itens com quantidade, valor unitário e total; Sistema, Acompanhamento, MAU excedente, Desconto e Total) e a linha do tempo de movimentos até o fim do ciclo.
  - O aviso "Itens detalhados indisponíveis" aparece quando o fechamento só tem os totais.
  - Um botão "Baixar PDF" que gera o mesmo arquivo já existente.
- Os dados vêm da mesma busca usada pelo PDF e só são carregados quando a janela é aberta.

## 2. Comparar fechamentos
- Na aba de fechamentos, um botão **"Comparar"** aparece quando existem 2 ou mais fechamentos enviados.
- Ele abre uma janela com dois seletores: fechamento base (A) e fechamento comparado (B). Por padrão, vêm os dois mais recentes.
- **Blocos de resumo**: total líquido de A e de B, diferença em R$ e em %, e quantidade de clientes em cada um.
- **Tabela por cliente**, com uma situação para cada um:
  - **Novo**: aparece só em B.
  - **Saiu**: aparece só em A.
  - **Aumentou** ou **Reduziu**: a diferença do líquido é diferente de zero.
  - **Igual**: o valor não mudou.
- Cada linha mostra o líquido em A, o líquido em B e a diferença. Dá para filtrar por situação.
- Usa só os valores líquidos gravados nos fechamentos já enviados ao parceiro. A comparação aparece para todos os parceiros que veem fechamentos, porque esses valores já aparecem na lista para eles.

## Validação
- Com e sem a permissão de valores (o botão de auditoria some sem ela).
- Os valores da tela batem com o PDF e com o resumo.
- Comparação entre Agosto/2026 e Setembro/2026 da Rabbit Agency.
- Celular, tablet e computador, nos temas claro e escuro.

## Detalhes técnicos
- Reaproveitar `getAuditoriaFechamentoParceiro` (sem mudar o servidor) e o tipo `AuditoriaClienteParceiro`.
- Criar uma função pura `compararFechamentos(a, b)` em `src/lib/parceiro.financeiro.ts`, que agrupa por `clienteId` a partir de `FechamentoParceiro.linhas`, com teste em `src/lib/__tests__/`.
- Interface em `src/routes/parceiro.tsx`: um Dialog para a auditoria e um Dialog para a comparação, com tokens semânticos e as cores já usadas.
