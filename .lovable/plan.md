## Plano: corrigir Fischer e impedir perda de lançamentos manuais

### 1. Corrigir o Fischer para 9 usuários

Vou ajustar a conta **Instituto Murilo Fischer** para bater exatamente os 9 logins informados:

- Total atual no banco: **4 usuários ativos**
- Logins informados: **9 usuários totais**
- Movimento novo necessário para reconciliar: **+5 usuários**

Vou registrar um movimento de upgrade:

- Cliente: Instituto Murilo Fischer
- Data: `2026-06-18`
- Tipo: `upgrade`
- Delta de usuários: `+5`
- Observação: `Login extra - ajuste para 9 usuários totais conforme auditoria de logins`

E atualizar o cadastro do Fischer para:

- `usuarios_ativos = 9`

Com a regra já corrigida no relatório, esse movimento vai aparecer como:

- `+R$ 149,95/mês` (`5 × R$ 29,99`)

### 2. Não apagar o Dr. Lucas nem outros clientes manuais

Confirmei que **Dr. Lucas não está mais na tabela de clientes** agora. Para impedir que isso volte a acontecer, vou remover/neutralizar o comportamento perigoso que pode apagar dados reais:

- A função `resetAll` atualmente executa deletes amplos em:
  - clientes
  - planos
  - parceiros

Vou alterar essa função para **não deletar mais dados da nuvem**. Ela poderá no máximo limpar o estado local/visual, mas não poderá apagar registros reais do banco.

Isso protege clientes lançados manualmente, incluindo o Dr. Lucas, contra sumirem depois de uma atualização/ação de reset.

### 3. Restaurar Dr. Lucas

Como o Dr. Lucas não aparece mais no banco, eu preciso recriá-lo. Como você ainda não passou os dados completos dele nesta mensagem, vou deixar a restauração preparada de forma segura:

- Se você me passar os dados do Dr. Lucas, eu insiro novamente com o plano, data de início, usuários/canais/contatos e valores corretos.
- Enquanto isso, a prioridade da implementação será impedir novos apagamentos.

Dados que preciso para recriar Dr. Lucas corretamente depois:

- Nome exato / nome financeiro
- Plano
- Data de início/setup
- Vencimento/ciclo
- Quantidade de WhatsApp, Instagram, Messenger, Z-API
- Usuários ativos
- Contatos ativos
- Valor setup pago
- Valor acompanhamento, se houver

### 4. Validação

Depois da implementação, vou validar:

- Fischer aparece com **9 usuários ativos**
- Movimento de 18/06 aparece no histórico
- Auditoria do fechamento cobra o movimento como **5 × R$ 29,99**
- `resetAll` não possui mais deletes amplos em clientes/planos/parceiros