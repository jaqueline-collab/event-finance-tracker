## O que vou adicionar

Um botão **"Detalhar"** (ícone `FileSearch`) na mesma linha do header do fechamento em `/resumo` — entre o nome (`Essencial Rabbit Agency · Junho/2026 · 13 conta(s)`) e o valor total. Ele abre um `Dialog` grande (max-w-6xl, scroll interno) com o dossiê de auditoria de **todos os clientes daquele fechamento**.

## Conteúdo do popup (por cliente, em ordem alfabética)

Cada cliente aparece dentro de um `Accordion` expansível:

### 1. Cabeçalho
Nome, plano atual, ciclo do fechamento (05/06 → 04/07), vencimento, status (ativo / churn no ciclo), data de início, data de churn (se houver).

### 2. Setup
- Data de entrada (`dataInicio`).
- Plano contratado no setup (nome + `valorMensal`).
- Configuração inicial: canais WhatsApp/Insta/Messenger, usuários, contatos, IA, Asaas, Zapi, Transcrição.
- Valor de setup pago (`valorSetupPago`).

### 3. Linha do tempo de movimentos (todos, ordem asc)
Tabela com uma linha por registro de `elora_movimentos` do cliente até o fim do ciclo:
- Data
- Tipo (upgrade / downgrade / servico / setup / churn) com badge
- Descrição do delta (canais Whats +1, usuários +2, contatos −100, IA ativada, etc.) renderizada a partir dos campos numéricos — mesmo padrão já usado no PDF em `movsMes`
- Valor: `valorServico` para movimentos avulsos; para upgrade/downgrade mostro o **impacto recorrente** = `receitaMensalCliente(depois) − receitaMensalCliente(antes)` usando `clienteSnapshotAt`
- Observação (`obs`) se houver

### 4. Composição do plano HOJE (breakdown de cobrança)
Para cada cliente, tabela linha-a-linha reaproveitando **exatamente** as regras que `receitaMensalCliente` já usa (multiplicação direta `qtd excedente × preço do plano` — sem escala Helena, que é só custo):

- Licença base do plano (`plano.valorMensal`)
- Canais WhatsApp excedentes: `max(0, canaisWhats − canaisWhatsInclusos) × valorCanalWhatsExc`
- Canais Instagram excedentes: idem com `valorCanalInstaExc`
- Canais Messenger excedentes: idem com `valorCanalMessengerExc`
- Usuários excedentes: `max(0, usuariosAtivos − usuariosInclusos) × valorUsuariosExc`
- Contatos excedentes: `max(0, contatosAtivos − contatosInclusos) × valorContatosExc`
- IA / Asaas / Zapi / Transcrição (quando marcados e não inclusos no plano) com o valor unitário do plano
- Acompanhamento (`valorAcompanhamento`)

Somatório fecha com:
- **Custo Sistema** = `receitaSistemaCliente` (tudo menos acompanhamento)
- **Custo Acompanhamento** = `cliente.valorAcompanhamento`
- **Custo Mês (total)** = `receitaMensalCliente`

Para isso extraio uma função pura `explicarReceitaCliente(cliente, plano)` em `src/lib/calc/receita.ts` que devolve `{ itens: { label, qtd, unit, total }[], subtotalSistema, acompanhamento, total }`. `receitaMensalCliente` passa a somar `.itens.total + acompanhamento` — mesmos números que hoje, sem regressão.

### 5. Ações
Botão **"Exportar PDF de auditoria"** gerando o mesmo conteúdo com `jsPDF` + `autoTable` (já importados no arquivo).

## Onde muda

- `src/routes/resumo.tsx`
  - Estado `detalharFechamentoId` + `Dialog`.
  - Botão `Detalhar` no header do fechamento.
  - Componente interno `<FechamentoAuditoriaDialog>` com o layout descrito.
  - Helper `descreverMovimento(m)` extraído do PDF.
  - Geração do PDF de auditoria.
- `src/lib/calc/receita.ts`
  - Nova função `explicarReceitaCliente(cliente, plano)`. `receitaMensalCliente` fica como um `sum(explicarReceitaCliente(...).itens) + acompanhamento` — mesmo resultado.

Sem mudanças de schema, sem novas tabelas. Dados já vêm de `elora_clientes`, `elora_movimentos`, `elora_planos`, `elora_fechamento_itens`.

## Validação

- `bunx tsgo --noEmit` limpo.
- Abrir `/resumo` → junho/2026 → fechamento "Essencial Rabbit Agency" → clicar em **Detalhar** → conferir os 13 clientes com setup + linha do tempo + composição atual. Somar "Custo Mês" de cada cliente = total da linha do fechamento no Resumo (auditoria bate).
- Exportar PDF e verificar que abre sem clipping.
