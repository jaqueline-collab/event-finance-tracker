## O que descobri primeiro (importante)

As alterações de dados que combinamos na rodada anterior **não persistiram** no banco — provavelmente a migration não chegou a ser aprovada/rodada. Estado atual:

- Plano **Rabbit** ainda está com ciclo `1 → 31` (deveria ser `5 → 4`).
- **Dr Alexandre Mansur** ainda com `valor_acompanhamento = 246` (deveria ser `250`).
- **Érico Servano**: existe o movimento `churn 2026-06-24` em `elora_movimentos`, mas `elora_clientes.data_churn` continua vazio (incoerência que distorce o fechamento).

Isso por si só já explica boa parte da divergência com a planilha do Monday (que tem vencimento dia 5 → ciclo 5→4). Vou aplicar de verdade, via migration, antes de comparar números.

## Plano

### 1. Reaplicar correções de dados (migration)
- `elora_planos`: ciclo do Rabbit (`rwq5rggn`) `1→31` → **`5→4`**.
- `elora_clientes` (Dr Alexandre Mansur): `valor_acompanhamento` 246 → **250**.
- `elora_clientes` (Érico Servano): `data_churn = 2026-06-24` (mantém o movimento já existente).

### 2. Persistência de filtros por página
Hoje o `FilterBar` mantém estado só em memória do componente — recarregou, perdeu. Vou:
- Criar um hook `usePersistentFilters(scope: string, defaults?: FilterState)` que serializa o `FilterState` em `localStorage` com chave por escopo (`elora.filters.<scope>`).
- Plugar em cada tela que usa filtros: **Clientes** (`scope: "clientes"`), **Financeiro** (`scope: "financeiro"`), **Resumo Mensal** (`scope: "resumo"`), **Parceiros** se aplicável.
- Cada escopo tem seu próprio padrão e os filtros só somem quando o usuário clicar em "Limpar filtros" (já existe) ou remover o chip. SSR-safe (lazy init, sem tocar `localStorage` na primeira render do servidor).

### 3. Resumo Mensal — exibir vencimento
- Adicionar coluna **Vencimento** na tabela do modal e do PDF, ao lado de "Cliente / Plano". Valor: `obterVencimentoDaCompetencia(cliente, y, m, planos)` formatado `dd/mm/aa`.
- Manter o `vencimentoLabel` no cabeçalho como faixa (quando há vencimentos diferentes), mas agora também por linha.

### 4. Reconciliação contra a planilha (Rabbit, competência Junho/2026)
Referência do print: Total 7.829,54 · Sistema 4.229,54 · Assessoria 3.600 · Recebimento 05/jul · 13 itens.

Depois das correções do passo 1, vou:
- Rodar uma query somando, por cliente Rabbit ativo no ciclo 05/06–04/07/2026, o snapshot de fim de ciclo (`receitaCicloCliente` lógica).
- Cruzar linha a linha com o detalhe da planilha (você pode me passar o expand de **Junho - 2026** do Monday — os 13 itens com Sistema/Assessoria por cliente — ou eu listo o meu cálculo aqui e você confere).
- Onde divergir, identificar a causa (canais/usuários incorretos no cadastro, valor de acompanhamento, movimento faltando, churn fora do lugar, plano com inclusos diferentes etc.) e propor correção pontual de dados.

Repetir o mesmo procedimento para as competências fechadas anteriores (Fev–Mai) para garantir alinhamento histórico.

## Detalhes técnicos

- `usePersistentFilters` em `src/hooks/use-persistent-filters.ts`. Assinatura:
  `function usePersistentFilters(scope: string, defaults?: FilterState): [FilterState, (next: FilterState) => void]`. `useState(() => ler localStorage)` + `useEffect` para gravar. Guard `typeof window !== "undefined"`.
- `FilterBar` não muda — quem decide persistência é o consumidor (cada rota).
- Migration única, idempotente (`UPDATE ... WHERE ...`), sem schema change.
- Coluna Vencimento no PDF: ajustar a tabela em `src/routes/resumo.tsx` (gerador atual) sem mudar layout geral — só uma coluna a mais.

## Pergunta antes de implementar

Para o passo 4, você prefere:
(a) que eu liste o meu cálculo por cliente do ciclo 05/06–04/07 e você compara com o Monday, ou
(b) você me passa o detalhe expandido de **Junho - 2026** do Monday (13 linhas com Sistema/Assessoria) e eu faço o diff?

A opção (b) é mais rápida e precisa.
