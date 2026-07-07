
## Divergências identificadas

Cruzando as datas de criação dos logins com os movimentos atuais no banco:

### Instituto Murilo Fischer
- Total real: **9 logins** (3 base + **6 extras**). Cadastro está com `usuarios_ativos = 8` (falta 1).
- Extras esperados: 11/03, 25/05, 25/05, 09/06, 18/06, 25/06.
- Faltando no banco: extra do dia **09/06** (o movimento de 09/06 hoje é só `Instagram +1` — precisa coexistir com um `Usuários +1` na mesma data).

**Ações:**
- `elora_clientes` Fischer: `usuarios_ativos` 8 → 9.
- `elora_movimentos`: novo `upgrade` em 09/06/2026 com `usuarios_ativos = 1` (mantém o movimento de Instagram +1 do mesmo dia).

### INTEP's Treinamentos
- Total real: **6 logins** (24/03, 25/03×4, 13/04). 3 base + 3 extras. Cadastro `usuarios_ativos = 6` ✓.
- Extras esperados: 2 em 25/03 e 1 em 13/04.
- Banco hoje: setup "Logins Extra +3" em 24/03, +1 em 13/04, **+1 em 01/06 (fictício, criado por engano)**.

**Ações:**
- `elora_movimentos` INTEP: atualizar o movimento de setup — mover data 24/03 → **25/03** e reduzir `usuarios_ativos` 3 → **2**.
- Manter +1 em 13/04.
- Deletar o movimento fictício de 01/06.

### Majestic Transplante Capilar
- Total real: **5 logins** (17/03×3, 15/04, 30/04). 3 base + 2 extras. Cadastro `usuarios_ativos = 5` ✓.
- Extras esperados: 1 em 15/04 e 1 em 30/04.
- Banco hoje: setup 17/03 +1, 02/04 (WhatsApp+Z-API, ok), 15/04 +2, **01/06 +1 (fictício)**.

**Ações:**
- Deletar movimento de setup 17/03 (+1 usuário).
- Ajustar movimento 15/04: `usuarios_ativos` 2 → **1**.
- Criar movimento em 30/04 (`upgrade`, `usuarios_ativos +1`).
- Deletar movimento fictício de 01/06.
- Movimento de canais 02/04 permanece.

### ZAYN CLINICA LTDA
- Total real: **4 logins** (todos 10/02). 3 base + **1 extra**. Cadastro `usuarios_ativos = 5` (excesso de 1).
- Banco hoje: apenas movimento +1 em **11/05 (fictício)**.

**Ações:**
- `elora_clientes` Zayn: `usuarios_ativos` 5 → **4**.
- `elora_movimentos`: deletar movimento de 11/05.
- Criar movimento de setup em 11/02 (data_inicio) `upgrade` `usuarios_ativos +1` para representar o 4º login criado em 10/02.

## Recálculo dos fechamentos de junho/2026

Após corrigir cadastros e movimentos, reprocessar `elora_fechamento_itens` / `elora_fechamentos` / `elora_financeiro` dos 4 clientes em junho/2026 preservando `payload_snapshot.valorBrutoAnterior`. Sem DELETE de fechamento — apenas UPDATE.

Impacto esperado nos totais compostos (mensalidade hoje):
- Fischer: +1 usuário excedente → +R$ 29,99.
- INTEP: sem mudança de total (6 usuários já refletidos no cadastro).
- Majestic: sem mudança de total.
- Zayn: −1 usuário excedente → −R$ 29,99.
- Delta líquido do fechamento de junho: **0**.

## UI · faixa vermelha para churn no PDF

Em `exportarAuditoriaPdf` (`src/routes/resumo.tsx`, linhas ~2371-2378), a faixa do topo do card de cada cliente usa hoje `pdf.setFillColor(28, 63, 170)` (azul). Trocar para vermelho quando `cli.dataChurn` estiver preenchido:

```ts
const churned = Boolean(cli.dataChurn);
pdf.setFillColor(...(churned ? [190, 30, 45] : [28, 63, 170]));
pdf.rect(0, bannerY, pageW, bannerH, "F");
pdf.setFillColor(...(churned ? [220, 220, 220] : [253, 224, 71]));
pdf.rect(0, bannerY, 6, bannerH, "F");
```

Nenhuma outra mudança de layout — só cor da faixa e da barra lateral quando o cliente já sofreu churn.

## Validação

Regerar o PDF de junho/2026 e conferir:
- **Fischer**: linha adicional `Usuários +1` em 09/06, além de `Instagram +1`; Usuários excedentes = 6.
- **INTEP**: setup em 25/03 com `Usuários +2`; +1 em 13/04; sem linha de 01/06. Excedentes = 3.
- **Majestic**: sem `Usuários +1` em 17/03; `Usuários +1` em 15/04; novo `Usuários +1` em 30/04; sem 01/06. Excedentes = 2.
- **Zayn**: `Usuários +1` em 11/02; sem 11/05. Excedentes = 1 (composição cai para `Usuários excedentes 1`).
- Qualquer cliente com `data_churn` preenchido no PDF: faixa do topo em vermelho.

## Salvaguardas

Sem DELETE de cliente ou de fechamento. Apenas UPDATE em `elora_clientes`, UPDATE/INSERT/DELETE em `elora_movimentos` corretivos, recálculo dos itens de junho e edição do renderizador do PDF.
