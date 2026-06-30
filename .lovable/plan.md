## Objetivo

Deixar o **Resumo Mensal** falando a sua linguagem:
- **Competência** = mês do ciclo de faturamento (ex.: 01/06 a 30/06).
- **Vencimento** = data em que aquela competência é cobrada (ex.: 05/07).
- O fechamento mensal trabalha sobre a **competência**, e só permite fechar competências **já encerradas** (o último dia do ciclo já passou).

## 1. Padronizar o ciclo nos planos existentes

Migração única que preenche `cicloDiaInicial = 1` e `cicloDiaFinal = 31` em todos os planos que estão sem ciclo definido (hoje todos). O `31` é tratado como "último dia do mês" pela função `getCicloCliente` (já existe clamp). Você continua podendo editar o ciclo de cada plano na tela **Planos** e sobrescrever por cliente em **Clientes** — nada disso muda.

## 2. Resumo Mensal — filtros separados

Trocar o filtro único de mês por dois filtros independentes na barra de filtros:

- **Competência** (seleciona mês/ano do ciclo a apurar) — é o "mês do relatório".
- **Vencimento** (dia 1–31) — continua existindo como filtro de carteira (quem fatura naquele dia), igual hoje.

A tabela e os KPIs passam a ser indexados pela **competência**. Cada linha exibe:
- Competência (ex.: "Junho/2026 — ciclo 01/06 a 30/06")
- Vencimento da cobrança (ex.: "05/07/2026")
- MRR no fim do ciclo, novos, churns, receita, custo Helena, lucro.

## 3. Gerar Fechamento — só competências completas

O botão **Gerar Fechamento** só lista no seletor de competência os meses cujo **último dia do ciclo < hoje**. Hoje (30/06/2026) o último disponível é **Maio/2026**; **Junho/2026** só fica disponível a partir de 01/07/2026. Isso evita gerar fechamento parcial por engano.

A timeline do cliente, o PDF e o envio ao Financeiro continuam usando a mesma `receitaCicloCliente`, que já snapshota no último dia do ciclo (ou rateia, quando o plano tem cobrança proporcional ligada).

## 4. Detalhes técnicos

- **Migração SQL** (`supabase/migrations/...`): `UPDATE elora_planos SET ciclo_dia_inicial = 1, ciclo_dia_final = 31 WHERE ciclo_dia_inicial IS NULL OR ciclo_dia_final IS NULL`.
- **`src/routes/resumo.tsx`**:
  - Adicionar campo `competencia` no `FilterFieldDef` (mês/ano, default = competência mais recente fechada).
  - Renomear coluna/label "Mês" → "Competência" e exibir intervalo de ciclo abaixo do label.
  - Computar `vencimentoCompetencia` por cliente usando `obterVencimentoDaCompetencia` para a coluna de vencimento.
  - Restringir opções do seletor "Fechar competência" a meses com `getCicloCliente(...).fim < hoje`.
- **Sem mudança** em `receita.ts`, `ciclo.ts`, `custo.ts` — a lógica já está correta após as últimas correções.

## 5. Fora de escopo

- Não mexer no Dashboard, Financeiro, Clientes, Planos (além do default do ciclo).
- Não alterar lógica de cobrança proporcional.

```text
hoje = 30/06/2026
─ competências disponíveis para fechar ───────────────
 Mai/2026   ciclo 01/05–31/05   venc 05/06   ✅ pode fechar
 Jun/2026   ciclo 01/06–30/06   venc 05/07   ⛔ ainda em curso
```
