# Editar um fechamento já gerado

## O que você vai ver
- Na lista de fechamentos (Financeiro > Fechamento), um botão **Editar** ao lado de Auditoria, PDF, Renomear e Excluir. Mesma regra de quem exclui hoje: só administrador, checado também no servidor.
- O botão abre uma **página própria de edição** (`/financeiro/fechamento/{id}/editar`), não um pop-up.
- Fechamento editado mostra a marca **"Editado em dd/mm/aaaa"**.

## Página de edição
1. **Cabeçalho do fechamento:** título, descrição, observação, competência.
2. **Itens (um bloco por cliente):** plano, ciclo início/fim, vencimento, valor bruto, desconto; líquido calculado (bruto − desconto), só leitura.
3. **Composição do item:** tabela das linhas do sistema (quantidade, valor unitário, excedentes, atendentes cobrados) e linha de acompanhamento.
   - Chave "Isento" no acompanhamento: valor cobrado vira 0, valor original fica guardado, a composição mostra "Acompanhamento (isento)".
   - Incluir e remover linhas.
   - O bruto do item passa a ser a soma da composição.
4. **Lançamento financeiro do item:** vencimento, status e dados de NF editáveis; o valor segue sempre o líquido do item, sem digitação separada.
5. **Incluir cliente que ficou de fora** (com o cálculo atual como ponto de partida) e **remover item**, cada um com confirmação.
6. Campo **Motivo** opcional e botão Salvar. Antes de gravar, um resumo do que muda (antes → depois).

## Avisos antes de salvar
- Fechamento já liberado ao parceiro: aviso + confirmação obrigatória; a visão do parceiro passa a mostrar a edição.
- Lançamento com NF emitida: aviso listando cliente, número da NF, valor da NF e novo valor, deixando claro que a NF emitida não vai mais bater com o valor.
- O servidor recusa salvar sem essas confirmações quando elas forem exigidas.

## Ao salvar (tudo no servidor, numa operação)
- Recalcula líquido de cada item e os totais bruto, desconto e líquido do fechamento.
- Atualiza os lançamentos financeiros ligados (valor, vencimento, status, NF).
- Item removido: não é apagado; recebe marca de removido (com data e quem removeu), sai dos totais, do PDF e da visão do parceiro, e o lançamento ligado fica marcado como cancelado (nunca apagado).
- Grava cada campo alterado no histórico.
- PDF, visão do parceiro e auditoria leem dos mesmos dados gravados, então nada fica com valor antigo.

## Histórico
- Nova tabela `elora_fechamento_edicoes` (fechamento_id, item_id, campo, valor_antigo, valor_novo, motivo, editado_por, editado_em). Proteção ligada sem acesso direto; leitura e escrita só pelo servidor.
- A janela de Auditoria ganha a seção "Edições" (data, quem, item, campo, antes → depois, motivo), também no PDF de auditoria.

## Isolamento
- Toda leitura e gravação filtra por `fechamento_id`; itens e lançamentos são conferidos como pertencentes àquele fechamento e cliente. Nada desativado, nada "em breve".

## Testes
- Isentar acompanhamento: bruto, líquido e totais batem.
- Incluir item e remover item: totais corretos, item removido preservado.
- Histórico registra valor antigo e novo.
- Não administrador é recusado no servidor.
- Fechamento liberado ao parceiro exige confirmação.
- PDF e visão do parceiro usam os valores editados (e ignoram item removido).

Depois de executar: rodo os testes, mostro e paro. Sem publicar.

## Detalhes técnicos
- Migração: criar `elora_fechamento_edicoes` (GRANT só service_role, RLS sem policy); em `elora_fechamentos` acrescentar `editado_em`, `editado_por`; em `elora_fechamento_itens` acrescentar `removido_em`, `removido_por`. Nada apagado.
- Lógica pura em `src/lib/fechamento-edicao.ts` (recalcular composição/item/totais, isentar, gerar diff de campos) — alvo dos testes.
- `src/lib/fechamento-edicao.functions.ts`: `lerFechamentoParaEdicao` e `salvarEdicaoFechamento` com `requireSupabaseAuth` + checagem `is_admin` igual à exclusão; escrita via admin carregado dentro do handler; confirmações (`confirmouParceiro`, `confirmouNF`) validadas no servidor; `listarEdicoesFechamento` para a auditoria.
- Leituras existentes de itens (`fechamento-mensal.tsx`, `parceiro.functions.ts`, `notas-fiscais.functions.ts`, PDF) passam a filtrar `removido_em is null`.
- Rota nova `src/routes/financeiro_.fechamento.$id.editar.tsx` dentro do padrão visual atual.
