## Objetivo
Fazer todos os menus/popovers de filtro (incluindo o "Adicionar filtro") fecharem automaticamente ao clicar fora, e remover o X que adicionei antes.

## Mudanças em `src/components/filter-bar.tsx`

1. **Remover o botão X** dos painéis de filtro (single/multi/dateRange).
2. **Fechar ao clicar fora** usando um hook `useOutsideClick` com `useRef` + listener de `mousedown` no `document`:
   - Aplicar no `FilterChip` (envolve o botão do chip + o painel dropdown).
   - Aplicar no menu "Adicionar filtro" (envolve o botão + a lista de campos).
3. Manter o comportamento atual: single fecha ao selecionar; multi permanece aberto para múltiplas escolhas até clicar fora; dateRange fecha ao clicar num preset, mas permanece aberto ao editar datas manualmente até clicar fora.
4. Também fechar no `Escape` (bônus leve, mesmo listener).

## Detalhe técnico
- Adicionar um helper `useOutsideClick(ref, onClose, enabled)` local no arquivo, que registra `mousedown` e `keydown` (Escape) só quando `enabled` (menu aberto).
- Envolver o container relativo de cada dropdown com `ref` e passar `() => setOpen(false)`.
- Nenhuma alteração em `resumo.tsx`, `use-persistent-filters.ts` ou outros arquivos — o padrão vale para todo lugar que usa `FilterBar`.