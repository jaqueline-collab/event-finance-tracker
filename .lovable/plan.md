## 1. Plano Rabbit — ajustes

- `Essencial Rabbit Agency` (e demais Rabbit em `elora_planos`):
  - `canais_messenger_inclusos = 1` (Messenger passa a ser incluso; cobra só do 2º em diante).
  - `contatos_inclusos = 5000` (hoje está 500 — origem do "Contatos +500" errado no PDF).
- Nenhum outro preço alterado. Cálculo em `custoMensalCliente` já lê esses campos, então todos os clientes Rabbit refletem automaticamente.

## 2. Recalcular TODOS os fechamentos históricos

- Para cada `elora_fechamentos`:
  - Recalcular `valor_bruto`/`valor_liquido` de cada `elora_fechamento_itens` de clientes Rabbit usando os planos atualizados.
  - Reaplicar descontos vigentes na competência (`elora_descontos`), mantendo o `valor_desconto` original quando aplicável.
  - Atualizar totais do fechamento e o `elora_financeiro` vinculado (só o campo `valor`; `status`, vencimento e NF ficam intactos).
- Nenhum `DELETE`. Snapshot antigo guardado em `payload_snapshot.valorBrutoAnterior` para auditoria.

## 3. Correção do Instituto Murilo Fischer

- Adicionar movimento em `elora_movimentos` do Fischer em `09/06/2026` tipo `upgrade` com `canaisInsta +1` (upgrade de Instagram). Ajustar o cliente em `elora_clientes` se ainda não estiver com o Instagram somado.

## 4. Reescrita do PDF de auditoria (`exportarAuditoriaPdf` em `src/routes/resumo.tsx`)

**Página 1 — Resumo do faturamento**
- Cabeçalho: título, competência, vencimento.
- Tabela: `#`, Cliente, Plano, Bruto, Desconto, Líquido.
- Rodapé com totais consolidados (bruto, desconto, líquido) + ticket médio e contagem de clientes.

**Páginas 2..N — 1 por cliente**
- Faixa: `Nº. Nome` à esquerda, `R$ x/mês` à direita. Subtítulo só com `Plano: ...` (remover totalmente o texto `Ciclo: 05/06/2026 !' 04/07/2026`).
- Sem NBSP nas descrições (o `!' ` que aparecia é resultado de fonte + NBSP; substituir por espaço normal e usar fonte padrão do jsPDF que suporte os glifos).

**Fix da tabela LINHA DO TEMPO · MOVIMENTOS (sobreposição)**
- Larguras fixas por coluna (Data 22mm, Tipo 20mm, Descrição = restante, Valor 30mm à direita).
- `overflow: 'linebreak'` + `cellWidth: 'wrap'` só na coluna Descrição.
- Remover a data repetida do texto da descrição (já tem a coluna Data).
- Consolidar movimentos: agrupar por `(data, tipo, plano_id)` antes de renderizar — somar valores e mostrar `Usuários +2 · (Login extra 1º, 2º) +R$ 59,98/mês` numa linha só.
- Chips separados por ` · ` normal (sem NBSP), permitindo quebra natural.

**Composição da mensalidade**
- Corrigir "Contatos +500" — recalcular contatos excedentes usando `contatosInclusos` atualizado do plano (com Rabbit em 5.000, a linha some para clientes dentro do limite).

## 5. Ordem de execução

1. Migração: `contatos_inclusos = 5000` e `canais_messenger_inclusos = 1` nos planos Rabbit.
2. Insert do movimento de Instagram do Fischer (09/06/2026) + ajuste do cliente.
3. Script de recálculo dos fechamentos históricos (UPDATE em itens, fechamentos e financeiro).
4. Reescrita do `exportarAuditoriaPdf`: página resumo + fix de larguras + consolidação de movimentos + remoção de data duplicada + remoção da linha Ciclo.
5. Validação: gerar PDF de junho/2026, conferir página 1 (resumo), Fischer (Instagram em 09/06 + linha única de usuários se aplicável) e Dr. Lucas (sem "Contatos +500", sem sobreposição).

## 6. Salvaguardas

- Continua valendo: sem DELETE de clientes, movimentos ou fechamentos. Confirmação forte na UI antes de qualquer remoção.
