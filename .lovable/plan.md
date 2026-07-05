Vou corrigir o crash do filtro no Resumo Mensal sem mexer no fluxo de login, permissões ou landing.

Plano:
1. Reproduzir o problema no `/resumo` aplicando filtros, para capturar o erro real do runtime.
2. Ajustar `src/routes/resumo.tsx` para não quebrar quando o filtro reduz os clientes/competências para zero ou deixa uma competência antiga salva incompatível.
3. Sanitizar o estado de filtros salvo no `localStorage`, removendo valores inválidos/antigos antes do cálculo renderizar.
4. Fazer o filtro “Competência” se autoajustar para uma opção válida quando o filtro de Plano/Parceiro/Vencimento muda.
5. Validar no navegador que adicionar filtro, selecionar opção e limpar filtros não levam mais para a tela “This page didn’t load”.

Arquivos esperados:
- `src/routes/resumo.tsx`
- possivelmente `src/hooks/use-persistent-filters.ts` ou `src/components/filter-bar.tsx` se o problema estiver no filtro genérico.