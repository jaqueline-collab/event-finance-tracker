# Disponibilizar o PDF de auditoria do fechamento para o parceiro

Hoje a Área do Parceiro (`src/routes/parceiro.tsx`, aba Fechamentos) só tem o botão "Baixar resumo do fechamento" (`gerarPdfResumoFechamento`), com uma linha por cliente. Falta o documento completo de auditoria — composição detalhada item a item e a linha do tempo de movimentos de cada cliente — que hoje só existe na tela interna (`exportarAuditoriaPdf` em `src/routes/resumo.tsx`).

## Regra de acesso
Só aparece para parceiros com `mostrar_valores_cliente = true` na tabela `elora_parceiros` — a mesma trava que já controla `veValores` em `getFinanceiroParceiro`. Parceiro sem essa permissão não vê o botão.

## O que não pode vazar
`getFinanceiroParceiro` já segue lista branca (nunca lê nem devolve custo, margem, lucro, WTS, desconto de escala). A nova função segue a mesma regra: só itens de cobrança (o que o cliente paga), nunca estrutura de custo interno.

## 1. Servidor: `src/lib/parceiro.financeiro.ts`

Adicionar ao `getFinanceiroParceiro` (ou nova função `getAuditoriaFechamentoParceiro`, chamada só quando o parceiro abrir o PDF de auditoria, para não pesar a carga inicial da tela) o cálculo por cliente de cada `FechamentoParceiro`:
- Reusar `composicaoDoFechamento(item, cliente, planos, movimentos)` de `src/lib/calc/composicao-fechamento.ts` (mesma função já usada na tela interna — não duplicar lógica).
- Linha do tempo: movimentos do cliente com `data <= item.cicloFim` (mesmo filtro aplicado na correção da auditoria interna), cada um com `{ data, tipo, descricao, valor }`, onde `valor` é o mesmo cálculo de impacto já usado em `deltaMovto` (resumo.tsx) — valores de venda ao cliente, nunca custo.
- Retornar só quando `veValores` for true; caso contrário nem calcular.

## 2. PDF: novo `gerarPdfAuditoriaFechamento` em `src/lib/parceiro-pdf.ts`

Mesma estrutura do `exportarAuditoriaPdf` interno, adaptada para os dados já filtrados que vêm do servidor (sem acesso a `planos`/`movimentos` crus no cliente — só o que a função do passo 1 devolver):
- Página de resumo: clientes do parceiro no fechamento, bruto/desconto/líquido (igual ao resumo atual).
- Uma página por cliente: cabeçalho com total "/mês" = valor líquido gravado, plano gravado, "Composição da mensalidade no fechamento" (itens, Sistema, Acompanhamento, MAU excedente, Desconto, Total), linha do tempo de movimentos do ciclo.
- Quando a composição não tiver itens detalhados (fonte "só totais"), mostrar o aviso igual ao PDF interno.

## 3. UI: `src/routes/parceiro.tsx`

No card de cada fechamento (aba Fechamentos, ao lado do botão "Baixar resumo do fechamento"), adicionar um segundo botão "Baixar auditoria do fechamento (PDF)", visível só quando `dados.veValores` for true. Ao clicar, busca os dados do passo 1 (se vier de uma nova função separada, chamar sob demanda nesse clique) e gera o PDF do passo 2.

## Critérios de aceite
- Parceiro sem `mostrar_valores_cliente` não vê o botão em nenhuma hipótese.
- Parceiro com a permissão baixa o PDF e os valores por cliente batem com o que já aparece no resumo e na tela interna de fechamento (mesma fonte: fechamento gravado).
- Nenhum campo de custo, margem, lucro, WTS ou desconto de escala aparece em nenhum lugar do novo PDF.
- `roadmap.md`: marcar como concluída "Disponibilizar auditoria do fechamento para o parceiro".

## Restrição
Mesma regra do resto do trabalho de fechamento: nenhum fechamento gravado é alterado ou recalculado. Isso é só leitura e exportação de um PDF novo.