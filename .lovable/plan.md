# Corrigir filtros de Canal e Atendente (Relatório diário)

## Problema
Na Área do Cliente, aba Relatório diário, os filtros de Canal e Atendente quebram a página com o erro
"A <Select.Item /> must have a value prop that is not an empty string".
Causa confirmada em `src/components/resultados-cliente.tsx`:
- Linha ~558: `<SelectItem key={c || "__vazio"} value={c}>` — quando um canal vem vazio (`""`) na tabela, o item recebe `value=""` e o Radix Select lança o erro.
- Linha ~570: mesmo caso para atendente (`value={a}`).

## Correção (só `src/components/resultados-cliente.tsx`)

1. **Valor do item**: nos dois filtros, o valor do `<SelectItem>` passa a ser `c || "nao_informado"` / `a || "nao_informado"` (nunca string vazia). O rótulo exibido continua `rotuloDimensao(...)`, que já mostra "Não informado" para valor vazio.
2. **Opção "Todos"**: já usa `value="todos"` — sem mudança.
3. **Lógica de filtro**: trocar a comparação direta (`l.canal === canalFiltro`) por um helper:
   - filtro `"todos"` → passa tudo (sem filtro);
   - filtro `"nao_informado"` → passa só linhas com valor vazio (`""`);
   - outro valor → igualdade normal.
   Mesma regra para atendente. A linha Total no topo continua somando só as linhas que passam pelos filtros ativos (já é derivada de `linhasFiltradas`, não muda).

## Validação
- `bunx tsgo --noEmit` limpo e build OK.
- Playwright: abrir `/area-do-cliente?como=<cliente>`, aba Relatório diário, conferir que a página não quebra, que a opção "Não informado" aparece nos dois filtros quando houver linha com canal/atendente vazio, e que a linha Total reflete o filtro.
- Temas claro/escuro e larguras 390/834/1440 na tela da aba.
