## Nome para Financeiro no cadastro de clientes

Adicionar um campo opcional **"Nome para Financeiro"** no cliente, que será usado no PDF de fechamento sempre que estiver preenchido. Se vazio, o PDF continua usando o nome do cliente.

### 1. Banco
- Adicionar coluna `nome_financeiro text` (nullable) em `elora_clientes`.

### 2. Cadastro de Cliente (`src/routes/clientes.tsx`)
- Novo input "Nome para Financeiro" logo abaixo do campo Nome.
- Placeholder: "Nome que aparecerá no PDF de cobrança (opcional)".
- Persistir no insert/update.

### 3. PDF de Fechamento (`src/routes/resumo.tsx`)
- No body da tabela de clientes faturados do PDF, usar `cliente.nome_financeiro || cliente.nome`.
- A tela do app continua mostrando o nome normal — só o PDF muda.

### Fora de escopo
- Não mexer em RLS, cálculos, descontos ou outras telas.