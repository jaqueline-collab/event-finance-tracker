## Análise

Levantei todos os movimentos de `upgrade`/`downgrade` no banco e cruzei com `data_vencimento` de cada cliente para identificar quais sofriam o mesmo bug (snapshot tirado no vencimento do início do ciclo, ignorando alterações feitas depois).

| Data movimento | Cliente | Tipo | Dia venc. | Ciclo afetado | Bug antes do fix? | Corrigido pelo fix atual? |
|---|---|---|---|---|---|---|
| 07/03/2026 | Instituto Murilo Fischer | downgrade | 05 | mar → fechamento abr | Sim | Sim |
| 11/03/2026 | Instituto Murilo Fischer | upgrade | 05 | mar → fechamento abr | Sim | Sim |
| 20/03/2026 | Instituto Murilo Fischer | downgrade | 05 | mar → fechamento abr | Sim | Sim |
| 08/04/2026 | Instituto Murilo Fischer | upgrade | 05 | abr → fechamento mai | Sim | Sim |
| 13/04/2026 | INTEP's Treinamentos | upgrade | 05 | abr → fechamento mai | Sim | Sim |
| 15/04/2026 | Majestic Transplante Capilar | upgrade | 05 | abr → fechamento mai | Sim | Sim |
| 28/04/2026 | Instituto Murilo Fischer | upgrade | 05 | abr → fechamento mai | Sim | Sim |
| 11/05/2026 | ZAYN CLINICA LTDA | upgrade | 05 | mai → fechamento jun | Sim | Sim |

**Padrão:** todos os 8 movimentos ocorrem **após** o `data_vencimento` (dia 5) do mês em que aconteceram. Antes do fix aplicado em `receitaCicloCliente`, o snapshot era tirado no dia 5 e qualquer alteração posterior era revertida — então **todos** estavam exibindo no fechamento o valor antigo, igual ao mês anterior.

**Após o fix** (snapshot no último dia do ciclo, `new Date(y, m+1, 0)`), os 8 casos passam a refletir corretamente o plano/configuração vigente no fim do mês, e a cobrança subsequente bate com o fechamento.

## Recomendação

Nenhuma alteração de código adicional é necessária — o fix já cobre 100% dos casos identificados no banco. Sugestão de validação manual no app:

1. Abrir **Fechamento Mensal de abril/2026** e conferir Instituto Murilo Fischer (deve refletir os 3 movimentos de março: downgrade 07, upgrade 11, downgrade 20 — valor final = estado em 31/03).
2. Abrir **Fechamento de maio/2026** e conferir IMF, INTEP's, Majestic (valor = estado em 30/04).
3. Abrir **Fechamento de junho/2026** e conferir Zayn (já validado).

## Observação (opcional, fora deste escopo)

A coluna "Receita" do **histórico mensal** (linhas 213 e 775 em `src/routes/resumo.tsx`) ainda usa `receitaMensalClienteEm`, que snapshota no vencimento. Isso significa que o histórico mensal pode divergir do fechamento mensal nos meses em que houve upgrade/downgrade após o vencimento. Se quiser que histórico e fechamento batam exatamente, posso trocar essa coluna para usar `receitaCicloCliente` também — me avise se quer que eu inclua essa alteração.
