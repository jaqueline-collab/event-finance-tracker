## Resumo

Cinco mudanças encadeadas: (1) dia de vencimento por plano (com sobrescrita por cliente), (2) importação de fechamentos respeitando esse dia, (3) filtro de vencimento no Resumo Mensal, (4) botão "Enviar para Financeiro" dentro do popup de fechamento (consolidado ou por cliente), (5) envio do PDF por e-mail via Lovable Emails.

---

## 1. Dia de vencimento no Plano (padrão) + sobrescrita por Cliente

**O que já existe:** `Cliente.dataVencimento` (dia 1-31).
**O que falta:** `Plano.diaVencimento` (dia 1-31).

- Migração SQL: adicionar coluna `dia_vencimento int` em `elora_planos`.
- `src/lib/types.ts`: adicionar `diaVencimento?: number | null` em `Plano`.
- `src/lib/store.ts`: mapear no toRow/fromRow; criar helper `getDiaVencimentoEfetivo(cliente, plano)` → retorna o do cliente se houver, senão o do plano, senão `null` (mantém comportamento atual).
- `src/routes/planos.tsx`: input numérico (1-28 sugerido) "Dia de vencimento padrão".
- `src/routes/clientes.tsx`: label do campo vira "Dia de vencimento (sobrescreve plano)".
- Refatorar `obterVencimentoDaCompetencia` para usar `getDiaVencimentoEfetivo`.

## 2. Bug do fechamento de fevereiro + ciclo correto

Hoje `financeiro.tsx > importarFechamentosAuto` força vencimento no **dia 10 do mês seguinte** e usa `clienteFaturaEm` que depende do dia do cliente — por isso clientes sem `dataVencimento` ficam de fora e fevereiro pode não aparecer.

**Mudança:** para cada competência `(y, m)`, agrupar os clientes ativos pelo **dia de vencimento efetivo** (do cliente, ou do plano). Cada grupo vira **um lançamento separado** no Financeiro com:
- descrição: `Fechamento DD/MM/AAAA · ciclo {mês anterior}`
- vencimento: data real (`y, m, dia`), respeitando o critério escolhido "depende do dia de vencimento do plano":
  - se `dia <= último dia de m` e `dia >= hoje quando m == mês atual` → vence em `m`
  - senão → vence em `m+1`
- valor: soma daquele grupo

Isso garante: clientes que vencem dia 5 e dia 10 geram 2 lançamentos no mesmo mês, e fevereiro deixa de "sumir".

## 3. Filtro de "data de vencimento" no Resumo Mensal

Em `src/routes/resumo.tsx`:
- Novo `Select` "Vencimento" ao lado dos filtros de plano/parceiro.
- Opções: `Todos` + lista derivada dinamicamente dos `diaVencimento` distintos (planos + clientes) — assim, ao criar/editar um plano com dia novo, a opção aparece automaticamente.
- O filtro acumula com plano/parceiro (mesmo padrão atual).
- O `linhas`/`fechamento` passa a considerar só clientes cujo dia efetivo bate com o filtro.

## 4. Botão "Enviar para Financeiro" dentro do popup de fechamento

No `Dialog` de "Elora · Fechamento Mensal" (resumo.tsx), abaixo dos checkboxes de incluir gráficos / observação:
- Botão **"Enviar para Financeiro"** + um `RadioGroup`:
  - `Consolidado` → 1 lançamento com a soma total filtrada
  - `Por cliente` → N lançamentos, 1 por cliente ativo no ciclo
- Cada lançamento herda: competência atual do popup, vencimento conforme o dia efetivo de cada cliente (regra do item 2), categoria "Receita", status `pendente`, descrição incluindo nome do cliente quando "Por cliente".
- Usa `addLancamento` do store (mesmo já usado no Financeiro).
- Toast de confirmação com `N lançamento(s) enviado(s)`.

## 5. Envio do PDF por e-mail (Lovable Emails)

No mesmo popup, adicionar:
- Campo de e-mail (destinatário) + botão **"Enviar por e-mail"**.
- Template transacional `fechamento-mensal` (React Email) com: marca, mês de competência, KPIs principais e nota explicando que o PDF segue como link de download (anexos não são suportados nativamente).
- O PDF é gerado no client (jsPDF já existe), salvo em Supabase Storage (bucket `fechamentos`, privado), e um **signed URL** de 7 dias é incluído no e-mail como botão "Baixar fechamento".
- Necessário rodar previamente o setup de Lovable Cloud Emails: configuração de domínio + infraestrutura de envio.
- Bucket `fechamentos` criado via tool dedicada; políticas RLS para `owner = auth.uid()` na pasta.

## Detalhes técnicos

```
[Plano.diaVencimento] ──┐
                        ├──> getDiaVencimentoEfetivo(cliente, plano)
[Cliente.dataVencimento]┘            │
                                     ▼
                       obterVencimentoDaCompetencia(y, m)
                                     │
        ┌────────────────────────────┼─────────────────────────────┐
        ▼                            ▼                             ▼
  Resumo Mensal               Importar (Financeiro)        Enviar p/ Financeiro
   (filtro vencimento)         (1 lançamento por dia)       (consolidado | por cliente)
```

- Migração: 1 ALTER TABLE adicionando `dia_vencimento`.
- Storage: 1 bucket `fechamentos` (privado) + policy de acesso por owner.
- Templates de e-mail: 1 arquivo em `src/lib/email-templates/fechamento-mensal.tsx` + registro em `registry.ts`.
- Server function: 1 helper `sendTransactionalEmail` (já documentado) chamado do botão do popup.
- Sem mudanças em rotas de autenticação ou Sidebar.

## Fora do escopo

- Webhook genérico / API REST externa (não solicitado nesta rodada).
- Reagendar fechamentos antigos já lançados — só novos imports passam a respeitar o dia. Posso adicionar botão "Reprocessar" depois se quiser.
