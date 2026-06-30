## Entendi a regra do Monday

```text
Competência: mês em que o ciclo COMEÇA
Data de recebimento: vencimento, sempre no mês seguinte (dia conforme plano/cliente)
```

Para o plano Rabbit (ciclo 5→4):

```text
Competência Fevereiro/2026 → ciclo 05/02 a 04/03 → recebimento 05/03/2026
Competência Março/2026     → ciclo 05/03 a 04/04 → recebimento 05/04/2026
Competência Abril/2026     → ciclo 05/04 a 04/05 → recebimento 05/05/2026
```

Para o plano Distribox (ciclo 1→31):

```text
Competência Fevereiro/2026 → ciclo 01/02 a 28/02 → recebimento dia configurado em Março/2026
```

Hoje o app trata competência como o mês em que o ciclo **termina** e calcula o vencimento no mês seguinte ao mês selecionado. Isso desloca tudo em 1 mês contra o Monday e zera fevereiro.

## Plano

### 1. Alinhar a semântica de competência
- Mudar a competência para representar o mês em que o ciclo **começa**.
- Vencimento = último dia do ciclo + 1, no dia configurado do plano/cliente.
- Resultado:
  - Rabbit fevereiro vence 05/03;
  - Rabbit março vence 05/04 (é o que o Monday chama de “Março - 2026”, R$ 6.899,67);
  - Rabbit abril vence 05/05;
  - Distribox fevereiro vence em março no dia configurado.
- Atualiza:
  - seletor de competência;
  - cabeçalho do modal de fechamento;
  - PDF;
  - tabela principal do histórico (label do mês e dado do vencimento);
  - filtro de vencimento (continua filtrando pelo dia do recebimento).

### 2. Coluna “Data de vencimento” no histórico
- Substituir a coluna **Faturados** da tabela do histórico por **Data de vencimento**, logo após **Mês de Competência**.
- Quantidade de clientes passa a aparecer só no detalhe expandido.
- A mesma coluna entra na prévia e no PDF do relatório.

### 3. Inclusão correta de clientes no ciclo
- Cliente entra na competência se esteve ativo em qualquer dia do ciclo da competência.
- Churn no meio do ciclo continua cobrando integralmente quando o plano está com a chave de proporcional desabilitada, igual ao Monday (ex.: Gabriele 31/03 e Pedro 18/03 cobram cheio no recebimento 05/04).
- Proporcional só rateia quando a chave estiver ativa.
- A data de início do cliente também é tratada como cobrança cheia quando proporcional está desligado (entra no recebimento seguinte com o valor integral).

### 4. Auditar a diferença sem forçar o valor
- Comparar linha a linha contra o Monday anexado para:
  - Fevereiro/2026 — recebimento 05/03 — Monday R$ 6.259,73 (Sistema 3.159,73 / Assessoria 3.100);
  - Março/2026 — recebimento 05/04 — Monday R$ 6.899,67 (Sistema 3.549,67 / Assessoria 3.350);
  - Abril/2026 — recebimento 05/05 — Monday R$ 6.179,63 (Sistema 3.329,63 / Assessoria 2.850).
- Para cada cliente do ciclo, mostrar:
  - valor Sistema no Monday;
  - valor Acompanhamento no Monday;
  - valor Sistema calculado pelo app;
  - valor Acompanhamento no app;
  - diferença e causa provável (cadastro divergente, movimento faltando, transcrição diferente, vencimento desviado etc.).
- Entregar essa auditoria em texto antes de qualquer correção de dados.

### 5. Só corrigir dados depois de confirmar a causa
- Se a auditoria apontar problema de cadastro ou movimento, listo explicitamente o que está diferente.
- Você confirma antes de eu rodar a alteração no banco.
- Nada de “forçar” o total para bater.

### Observações técnicas
- A função de ciclo passa a receber o mês de início da competência. Hoje ela recebe o mês de fim e faz wrap; será o oposto.
- O snapshot de fim de ciclo continua sendo a referência para receita recorrente quando proporcional está desligado.
- A regra de “cliente elegível para fechamento” passa a comparar o vencimento da competência com a data de hoje, não o fim do ciclo.