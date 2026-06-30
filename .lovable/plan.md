## 1. Corrigir alertas de segurança

### `elora_descontos` sem escopo por usuário (achado crítico do scanner)

Hoje a tabela tem políticas RLS com `using (true)` / `with check (true)`: qualquer usuário autenticado lê e altera descontos de qualquer outra conta. Todas as outras tabelas Elora já são escopadas por `user_id = auth.uid()`.

Migration:

1. `ALTER TABLE public.elora_descontos ADD COLUMN user_id uuid DEFAULT auth.uid();`
2. Backfill: `UPDATE public.elora_descontos SET user_id = c.user_id FROM public.elora_clientes c WHERE elora_descontos.cliente_id = c.id;` (descontos globais sem cliente recebem o `user_id` do admin atual).
3. `ALTER COLUMN user_id SET NOT NULL`.
4. Dropar as 4 policies "Authenticated can …" e recriar `own_select/insert/update/delete_elora_descontos` escopadas a `user_id = auth.uid()`, padrão idêntico ao `elora_clientes`.
5. Marcar o finding `elora_descontos_unscoped_access` e o warning genérico do linter como corrigidos.

Frontend (`store.ts`, `mappers.ts`): incluir `user_id` no insert a partir da sessão Supabase. Sem mudança de UI.

## 2. Investigar Majestic (validar hipótese)

Sua hipótese: a Majestic entrou em 17/03 já com o plano maior (2 adicionais a mais), e por isso o Monday está R$ 59,98 acima do app em abril.

Estado atual cadastrado (plano Essencial Rabbit Agency, ciclo 5→4):

```text
data_inicio       2026-03-17
canais_whats      2   (1 incluso → 1 exc)
canais_messenger  1   (1 incluso → 0 exc)
canais_zapi       1   (1 exc)
usuarios_ativos   4   (3 inclusos → 1 exc)
acompanhamento    R$ 250
```

Único movimento cadastrado: `2026-04-15 upgrade usuarios_ativos: 2  zapi: true` — ou seja, pré-15/04 ela estava com 2 usuários e sem Z-API.

Snapshot do app em abril (fim do ciclo 04/05): 199,99 + 250 + 29,99 (whats exc) + 29,99 (user exc) + 69,99 (zapi) = **R$ 579,96**. Delta para o Monday ≈ R$ 59,98 = exatamente **2 × R$ 29,99 (2 adicionais)**.

Vou entregar antes de tocar em qualquer dado:

1. Comparativo lado a lado **Majestic × Monday** para fev/mar/abr/mai (estado, movimentos, valor app, valor Monday, delta).
2. Duas hipóteses possíveis:
   - **A**: 2 adicionais existem desde 17/03 (mar, abr e mai abaixo no app).
   - **B**: 2 adicionais entraram no upgrade de 15/04 (só abr e mai abaixo).
3. Lista exata do ajuste para o app bater com o Monday — só executo após sua confirmação.

Para fechar a hipótese preciso de uma linha sua: na cobrança da Majestic em abril no Monday, o que aparece detalhado além de `Essencial Rabbit + 250 assessoria + 1 whats extra + 1 user extra + 1 Z-API`? São 2 canais Insta, 2 usuários a mais, outro módulo?

## 3. Cadastrar Cecilia Bunn (faltando no plano Rabbit)

Na auditoria do plano Rabbit identificamos que a Cecilia Bunn não está no banco, e por isso o fechamento ficou abaixo do Monday. Vou cadastrá-la assim que você confirmar os dados.

Preciso de você (pode mandar tudo numa linha só):

```text
Nome completo:
Data de setup (início):
Data de churn (se houver):
Plano: (Essencial Rabbit Agency? outro?)
Canais Whats / Insta / Messenger:
Z-API (qtd):
Usuários ativos:
Transcrição IA (sim/não):
Agente IA (sim/não):
Valor de acompanhamento (assessoria) mensal:
Valor de setup pago (se houve):
Ciclo personalizado? (se não, herda 5→4 do Rabbit)
```

Se algum desses campos for o padrão do Rabbit já me diz "padrão" que eu preencho.

## Ordem de execução

1. Migration de `elora_descontos` + ajuste no store/mappers + marcar findings como corrigidos.
2. Comparativo Majestic × Monday em texto — aguardo confirmação antes de cadastrar movimentos.
3. Cadastro da Cecilia Bunn assim que os dados chegarem.

## Detalhes técnicos

- Backfill roda antes do `NOT NULL` para não quebrar linhas existentes.
- `DEFAULT auth.uid()` simplifica inserts no client.
- Nenhum cálculo de Resumo Mensal muda nesta etapa — só descontos passam a ser por usuário.
