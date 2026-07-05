## 1. Corrigir o erro (React #185 = loop infinito de renderização)

Causa raiz em `src/routes/resumo.tsx`:
- `const today = new Date()` é criado a cada render.
- O `useMemo` de `opcoesFechamento` depende de `today` → nova referência todo render.
- O `useEffect` (linhas 703–711) depende de `opcoesFechamento` e `filtros` e chama `setFiltros(...)` sempre que a competência selecionada não está na lista → dispara novo render → novo `today` → novo memo → efeito roda de novo → loop.

Correção:
- Estabilizar `today` com `useMemo(() => new Date(), [])` (ou apenas a data ISO do dia).
- Reescrever o efeito para só limpar `filtros.competencia` quando (a) a chave é inválida ou (b) `opcoesFechamento` já carregou e não contém a chave — e **sem** incluir `filtros` inteiro nas deps (usar apenas `rawCompetenciaSel` e o array de keys estável).
- Não chamar `setFiltros` dentro do `abrirNovoFechamento` com uma competência que o efeito acabará apagando. A competência do modal passa a viver **apenas** em `competenciaNovoFechamento`, sem tocar em `filtros.competencia`.

## 2. Remover botões pedidos

No cabeçalho da página e/ou no modal, remover:
- Botão **Visualizar relatório** (olho / `Eye`).
- Botão **Exportar PDF** que fica na página (não no modal).

## 3. Reformular o modal "Novo fechamento"

Fluxo em dois passos dentro do mesmo Dialog:

**Passo 1 — Selecionar contas**
- Listar todas as contas cujo ciclo já encerrou **ou** está no último dia do ciclo (ou seja, elegíveis para fechamento), **e** que ainda não estão em outro fechamento da mesma competência.
- Cada linha: checkbox, cliente, plano, competência do ciclo, valor bruto do ciclo, vencimento.
- Ações: `Selecionar todos`, `Limpar seleção`.
- Botão `Avançar` (desabilitado se nenhuma conta marcada).

**Passo 2 — Detalhes e descontos**
- Campo **Nome do fechamento** (obrigatório) — usado como título e como descrição enviada ao Financeiro.
- Competência exibida como `{mês}/{ano}`.
- Tabela das contas selecionadas com coluna "Desconto" (botão + para abrir mini-form por linha: tipo `valor fixo` / `%`, valor, motivo opcional).
- Bloco **Desconto geral do fechamento**: tipo (`valor fixo` / `%`), valor, motivo.
- Resumo: subtotal bruto, desconto por conta, desconto geral, **total líquido**.
- Ações no rodapé (nessa ordem, à direita):
  - `Limpar tudo` — reseta seleção, nome, descontos, volta ao Passo 1.
  - `Gerar relatório (PDF)` — gera o PDF do fechamento (mesmo layout que já existe, só que a partir do estado do modal, não da página).
  - `Gerar fechamento` — persiste o fechamento + itens + descontos aplicados, fecha o modal e destaca a nova linha na árvore.

**Ações removidas do modal**: `Visualizar relatório` e `Exportar PDF` antigos ficam removidos (substituídos por `Gerar relatório (PDF)`).

## 4. Detalhes técnicos

- Elegibilidade de conta (reaproveita `clienteElegivelParaFechamento`): ciclo já fechou **ou** hoje é o último dia do ciclo.
- Excluir do Passo 1 clientes cujo `elora_fechamento_itens` já referencia essa mesma competência+cliente (para não fechar duas vezes a mesma conta no mesmo mês — múltiplos fechamentos por mês continuam permitidos, desde que com contas distintas).
- Descontos por linha e geral gravados via `addDesconto` já existente, escopo `cliente` ou `fechamento_inteiro`, `competenciaInicio = competenciaKey`, `recorrente=false`.
- `Gerar fechamento` chama `addFechamento({ nome, competencia, itens })` — usar o store atual; nenhum novo campo de banco.
- `Gerar relatório (PDF)` chama a mesma função `jspdf/autoTable` já usada, alimentada pelo estado local do modal.
- Nenhuma migração de banco necessária nesta etapa.

## 5. Validação

- `tsgo --noEmit`.
- Abrir `/resumo`, clicar `+ Novo fechamento`, confirmar que não há mais tela de erro.
- Selecionar contas → avançar → aplicar desconto em uma linha e um desconto geral → verificar total.
- `Limpar tudo` reseta corretamente; `Gerar relatório (PDF)` baixa o PDF; `Gerar fechamento` cria a linha na árvore e fecha o modal.
