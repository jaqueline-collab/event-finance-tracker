# MAU excedente: o cálculo já usa 0,095 — o que está errado é a exibição

## O que os números do seu print provam

Na linha da DISTRIBOX: `3.434 × R$ 0,10 = +R$ 326,23`.

- 3.434 × 0,10 = **343,40**
- 3.434 × 0,095 = **326,23** ✅

Ou seja: o valor cobrado **já vem do plano (0,095)** e está correto. O que aparece
como "R$ 0,10" é só o rótulo do preço unitário, porque o formatador de moeda
arredonda para 2 casas decimais. Nenhum cálculo está caindo no fallback.

## Correções

1. **Exibir o unitário com precisão** — criar um formatador dedicado para preço
   por contato (até 4 casas, sem zeros inúteis), usado em:
   - a coluna "Excedente" da tabela de Gerar Fechamento
   - o editor de MAU pós-fechamento (linha "Unit. excedente")
   - o PDF de detalhamento, onde o mesmo unitário aparece
   Resultado na tela: `3.434 × R$ 0,095 = +R$ 326,23`.

2. **Mudar o padrão de 0,10 para 0,095**, como você pediu — nos pontos de
   fallback (`?? 0.10`) e nos planos-modelo iniciais da store. Isso só afeta
   plano sem valor cadastrado; planos com valor continuam mandando.

## Escopo protegido

Nenhum fechamento existente é alterado, nada é gerado ou gravado, nenhuma
migração de banco. Só código de formatação e o valor padrão.

## Detalhes técnicos

`src/lib/calc/format.ts` (novo `formatBRLPreciso`), `src/routes/resumo.tsx`
(linhas 105/114/139 do editor de MAU, 881, 2023, 2583, 2890 e o trecho do PDF),
`src/lib/store.ts` (linha 893 e planos-modelo 283-285).
