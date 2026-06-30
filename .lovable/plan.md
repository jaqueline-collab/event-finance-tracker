## 1. Atualizar plano Rabbit (preços oficiais Monday)

Migração em `elora_planos` para o plano Rabbit:
- `preco_canal_whats_exc`, `preco_canal_insta_exc`, `preco_canal_messenger_exc` → **R$ 29,99**
- `preco_usuarios_exc` (login extra) → **R$ 99,00**
- `canais_messenger_inclusos` → **0** (Monday não inclui Messenger)
- Demais campos preservados

Efeito: o Resumo Mensal recalcula automaticamente todos os ciclos (fev–jun) usando os novos preços, eliminando as divergências residuais identificadas no `reconciliacao_v3.csv`.

## 2. Reformular Fechamento Mensal (`src/routes/resumo.tsx`)

**Filtros como única barra de controle** (FilterBar estilo Monday):
- **Competência** (mês/ano) — move o seletor que hoje fica no card "Gerar fechamento" para dentro dos filtros, como chip.
- **Parceiro** — novo filtro (multi-select de `elora_parceiros`).
- **Plano**, **Status**, **Busca** — mantidos.
- Botão **"Gerar PDF"** passa a viver **dentro da FilterBar** (canto direito), usando a competência selecionada no chip.

**Remover** o bloco superior "Gerar Fechamento" (card com seletor de mês isolado + botão). A competência agora é um filtro persistente como os demais.

**Mantido** (sem mexer agora):
- Drawer/timeline ao clicar no cliente (já mostra MRR inicial, movimentos, descontos, MRR final).
- Lógica de competência por ciclo individual.
- Coluna Vencimento `dd/MM/yyyy`.
- KPIs reagindo aos filtros + seleção.

## Detalhes técnicos

- Migração SQL única atualizando o registro do plano Rabbit em `elora_planos`.
- `resumo.tsx`: remover `<Card>` superior do fechamento; estender `<FilterBar />` com chips de Competência (MonthPicker) e Parceiro (multi-select); mover o botão `Gerar PDF` para slot de ação da FilterBar; o `mesReferencia` lido passa a vir do filtro de competência (persistido via `usePersistentFilters`).
- Sem alterações em PDF, drawer, cálculo de ciclos ou descontos.
