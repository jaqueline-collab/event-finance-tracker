# Correção do botão "Gerar Fechamento"

## Diagnóstico (leitura, nada alterado)

**1. Existe condição silenciosa?**
Sim — mas não é `disabled`. Nenhum dos dois botões tem `disabled`:

- Botão do topo (`src/routes/resumo.tsx:1453`) apenas abre o modal (`abrirNovoFechamento()`).
- Botão real de gravação, dentro do modal, "Gerar fechamento" (`resumo.tsx:1911`), chama `enviarParaFinanceiro()`, cuja **primeira linha é um return mudo**:

```text
if (!fechamentoData || !fechamentoSelecionado) return;   // sem toast, sem log, sem spinner
```

Quando a competência selecionada não produz dados (ciclo em aberto, nenhum cliente elegível/selecionado, filtros de plano/parceiro/vencimento zerando a lista), o clique não faz literalmente nada. Só existe aviso quando a lista chega vazia por outro caminho (`detalhes.length === 0`).

**2. Passou pela correção de "toast explicativo + saving"?**
Não. `resumo.tsx` recebeu o padrão apenas no botão de desconto (`savingDesconto`, linha 2537) e no salvar do MAU (linha 150). O fluxo de fechamento ficou de fora: sem estado `saving`, sem spinner, sem validação explicativa. É exatamente a lacuna.

**3. `addFechamento()` foi migrado para função de servidor?**
Não. Em `src/lib/store.ts:767` ele ainda usa o caminho do navegador: `getAuthUid()` + `insert()` direto em `elora_fechamentos`/`elora_fechamento_itens`, sem prazo (timeout). `addLancamento`, chamado antes dele no mesmo fluxo, segue o mesmo caminho. Ou seja: mesmo quando o clique passa da validação, ele pode ficar pendurado sem retorno — o mesmo padrão que travava Clientes e Movimentos.

## Correção proposta

### A. Feedback explícito no botão (frontend)
- Trocar o `return` mudo por validações com `toast.error` específicas: sem competência selecionada, sem dados no ciclo, nenhum cliente selecionado.
- Adicionar estado `gerandoFechamento`: botão "Gerar fechamento" com spinner + texto "Gerando..." e `disabled` apenas durante a gravação (nunca antes).
- Botão do topo continua abrindo o modal, mas avisa por toast quando não há competência elegível em vez de abrir um modal vazio.

### B. Migração para função de servidor autenticada
- Criar `src/lib/fechamentos.schemas.ts` (Zod: fechamento + itens + lançamentos financeiros).
- Criar `src/lib/fechamentos.functions.ts` com `registrarFechamento` (`createServerFn` + `requireSupabaseAuth`), que numa única chamada:
  1. insere os lançamentos em `elora_financeiro`;
  2. insere o fechamento pai em `elora_fechamentos` com `criado_por = context.userId`;
  3. insere os itens em `elora_fechamento_itens`;
  4. em caso de erro, desfaz o que criou nessa chamada e devolve mensagem de erro real.
- Módulo mantido como wrapper fino (helpers em `fechamentos.server.ts`), conforme o padrão já usado em clientes/movimentos.
- `addFechamento` na store passa a chamar a função de servidor via `gravarComPrazo(..., 20000)` e só atualiza o Zustand após sucesso confirmado.

### C. Escopo protegido
- Nenhum fechamento existente (fev–jun/2026) é lido, alterado ou apagado.
- Nada é gerado: a correção só torna o botão funcional e falante.
- Nenhuma rotina de limpeza/importação em lote é adicionada.

## Detalhes técnicos
Arquivos tocados: `src/routes/resumo.tsx` (validação + estado de saving), `src/lib/store.ts` (`addFechamento`), novos `src/lib/fechamentos.schemas.ts`, `src/lib/fechamentos.functions.ts`, `src/lib/fechamentos.server.ts`. Sem migração de banco.
