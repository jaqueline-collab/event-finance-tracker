## Objetivo

Transformar a página "Resumo Mensal" em "Fechamento Mensal" com fechamentos persistentes, agrupados em árvore de 3 níveis (Competência → Fechamentos → Contas → Detalhes), com múltiplos fechamentos por mês, elegibilidade por fim de ciclo e exclusão restrita a super admin.

## 1. Renomear em todo o app

- Sidebar (`src/components/app-sidebar.tsx`): "Resumo Mensal" → "Fechamento Mensal".
- Permissões (`src/lib/permissions.ts`): label do módulo `resumo` → "Fechamento Mensal" (mantém `key: "resumo"` e `url: "/resumo"` para não quebrar permissões existentes).
- `head()` da rota `src/routes/resumo.tsx`: título "Fechamento Mensal · Elora".
- Títulos, subtítulos e textos internos da página que hoje dizem "Resumo Mensal".

Rota física continua `/resumo` (para preservar permissões e links salvos). Se você preferir renomear a URL também, me avise que ajusto.

## 2. Formato do mês de competência

Trocar todo label de competência para `{Nome do mês}/{ano completo}`, ex.: `Novembro/2026`. Aplicar em:
- Cabeçalho de cada linha de competência.
- Filtro de competência (opções e chip).
- PDF exportado.
- Modais/toasts que citem competência.

## 3. Persistir "Fechamento" como entidade

Hoje o fechamento é calculado on-the-fly e só vira lançamento em `elora_financeiro`. Para suportar múltiplos fechamentos por mês, listagem em árvore e exclusão, criar tabelas:

**`elora_fechamentos`**
- `competencia` (YYYY-MM), `titulo` (texto — ex.: "1º fechamento", "Vencimento dia 10"), `descricao` (opcional), `status` (`rascunho` | `emitido` | `cancelado`), `criado_por`, `total_bruto`, `total_desconto`, `total_liquido`, timestamps.

**`elora_fechamento_itens`** (uma linha = uma "conta" dentro do fechamento)
- `fechamento_id`, `cliente_id`, `plano_id_snapshot`, `ciclo_inicio`, `ciclo_fim`, `vencimento`, `valor_bruto`, `valor_desconto`, `valor_liquido`, `lancamento_financeiro_id` (link opcional), `payload_snapshot` (JSONB com os detalhes que hoje só existem em runtime — canais, MAU, extras — para a "conta" ficar auditável mesmo se o cliente mudar depois).

RLS: leitura para `authenticated`; INSERT/UPDATE para `authenticated`; DELETE **apenas** para admin (`public.is_admin()`). GRANTs conforme convenção do projeto.

## 4. Regra de elegibilidade

Um cliente vira uma "conta" disponível para inclusão num fechamento quando o **último dia do ciclo dele já passou** (`ciclo.fim < hoje`). Hoje o código usa `vencimento ≤ hoje`; trocar para `ciclo.fim < hoje` conforme pedido.

Consequências:
- Na competência atual, só aparecem contas de clientes cujo ciclo já fechou.
- Contas ainda dentro do ciclo não aparecem na lista de "disponíveis".
- Contas já incluídas em um fechamento **daquela competência** somem da lista de "disponíveis" (para não fecharem duas vezes por engano; ainda dá para incluí-las manualmente com um toggle "mostrar já fechadas" se quiser — pergunto abaixo).

## 5. Múltiplos fechamentos no mesmo mês

- Botão "Novo fechamento" dentro de cada competência.
- Ao criar, o modal atual de fechamento vira o formulário do novo fechamento: seleciona contas disponíveis, aplica descontos, define título e descrição, e salva.
- Ao salvar, cria 1 registro em `elora_fechamentos` + N em `elora_fechamento_itens`, e opcionalmente gera lançamentos em `elora_financeiro` (mantendo o comportamento atual de "enviar ao financeiro").

## 6. Árvore de 3 níveis

Substitui a tabela atual por uma árvore expansível:

```text
▸ Novembro/2026                          (competência)
  ▸ 1º fechamento — 12/11                (fechamento)
    ▸ Cliente ACME                       (conta)
        detalhes: ciclo, plano, canais, extras, descontos, bruto, desc, líquido
    ▸ Cliente Beta
  ▸ 2º fechamento — 25/11
▸ Outubro/2026
```

- Nível 1 (competência): resumo agregado + botão "Novo fechamento".
- Nível 2 (fechamento): título, data, totais, botão **excluir** (só admin, com confirmação).
- Nível 3 (conta): cliente, vencimento, valor líquido; expande para os detalhes da conta (o mesmo conteúdo que hoje aparece no modal do cliente).

Cada nível usa o mesmo padrão de expansão via chevron.

## 7. Exclusão por super admin

- Botão de lixeira ao lado do título do fechamento, visível apenas quando `useCurrentUserAccess().isAdmin` for `true`.
- Confirmação em `AlertDialog`: "Excluir fechamento? Esta ação também remove os lançamentos financeiros gerados por ele (se houver)."
- Ação: DELETE cascata em `elora_fechamento_itens`, DELETE em `elora_fechamentos`, e remoção dos `elora_financeiro` vinculados via `lancamento_financeiro_id`.

## Detalhes técnicos

- Migração cria as duas tabelas com GRANTs (`authenticated` full + `service_role` full), habilita RLS e cria policies (SELECT/INSERT/UPDATE para `authenticated`, DELETE apenas via `public.is_admin()`).
- Store (`src/lib/store.ts`) ganha `fechamentos`, `fechamentoItens`, `addFechamento(fechamento, itens)`, `removeFechamento(id)`.
- `elegibilidadeParaFechamento` na página passa a checar `ciclo.fim < hoje`.
- Componente da árvore fica em `src/routes/resumo.tsx` (ou extraído para `src/components/fechamento-tree.tsx` se ficar grande).
- Filtros atuais (plano, parceiro, vencimento, tipo, competência) continuam funcionando e afetam o que aparece dentro de cada fechamento e a lista de "disponíveis".

## Ponto para confirmar

1. **URL:** manter `/resumo` (não quebra nada) ou também renomear para `/fechamento-mensal`?
2. **Contas já incluídas em outro fechamento da mesma competência** aparecem por padrão como "disponíveis" novamente? Meu default é **não** aparecer, com um toggle "mostrar já fechadas".
