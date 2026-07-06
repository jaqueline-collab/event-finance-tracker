## Plano

### 1. Proteger lançamentos manuais e fechamentos (regra permanente)
- Nenhuma rotina de atualização/importação/seed do sistema pode apagar, sobrescrever ou substituir:
  - clientes cadastrados (ex.: Dr. Lucas),
  - movimentos já registrados,
  - lançamentos financeiros manuais,
  - fechamentos já gerados e seus itens.
- Ajustar a importação de fechamentos para ser estritamente **incremental**: criar apenas o que falta, jamais remover ou reescrever registros existentes.
- Remover/neutralizar qualquer script que faça delete em massa (ex.: `delete_acompanhamento`, `resetAll`) para não rodar por engano em novas atualizações.

### 2. Corrigir Majestic Transplante Capilar desde 02/04/2026
- Inserir **1 movimento novo** em `elora_movimentos` para o cliente Majestic (`xf31bf9b`):
  - data: `2026-04-02`
  - tipo: `upgrade`
  - `+1 canal WhatsApp` e `+1 canal Z-API`
  - observação: `Extra WhatsApp + Z-API desde o setup`
- Atualizar o cadastro atual da Majestic somando esses extras aos valores atuais (`canais_whats +1`, `canais_zapi +1`, `zapi = true`).
- Não mexer em nenhum outro movimento nem no Dr. Lucas.

### 3. Validação
- Conferir no banco:
  - Majestic com `canais_whats` e `canais_zapi` acrescidos de 1 e movimento de 02/04/2026 presente.
  - Dr. Lucas continua no banco, intacto.
  - Todos os fechamentos e lançamentos financeiros manuais continuam presentes.