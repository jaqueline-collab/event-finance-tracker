# Ajustes nas Etapas D e F: Novos ADS 251 x 250 e filtros padrão da Matriz

Nada será publicado. Paro e mostro ao fim de cada parte.

## Parte 1. Diferença em Novos ADS (Dr. Ricardo, 22/09 a 03/10)

O que já se sabe hoje: a Matriz sem filtro lê o relatório gravado (e calcula na hora só os dias sem gravação). Com qualquer filtro, ela recalcula tudo na hora. São dois caminhos, por isso podem divergir. A causa exata do 1 a mais **ainda não está confirmada**.

1. **Diagnóstico (só leitura).** Para cada dia, comparo Novos ADS gravado x recalculado, por canal/atendente/equipe. No dia que divergir, identifico o contato e verifico (sem nome ou telefone completos):
   - data de criação no Elora x data em que entrou no espelho (chegou depois da gravação?);
   - dia em America/Sao_Paulo x UTC (perto da meia-noite?);
   - origem/UTM hoje x na gravação (mudou para ADS depois?);
   - se a regra do motor mudou entre a gravação e agora.
   Digo qual número está certo e por quê. Paro e mostro antes de mexer em qualquer coisa.
2. **Uma regra só.** A Matriz passa a usar o mesmo cálculo nos dois caminhos: as linhas do dia saem sempre do mesmo motor, e o filtro só restringe o conjunto de contatos. Sem filtro = mesmo resultado de um filtro que mantém todos.
3. **Relatório defasado.** Se o gravado estiver errado, guardo as linhas afetadas em `elora_relatorio_diario_backup`, confiro campo a campo, regravo só essas linhas e mostro a consulta de restauração (não executada). Totais diários das demais colunas continuam iguais; mostro a conferência.
4. **Teste novo:** para todos os 12 dias, Matriz sem filtro e com filtro "não exclui ninguém" dão exatamente o mesmo número em todas as 5 colunas padrão. Sem nada fixo do Dr. Ricardo no teste.

## Parte 2. Filtros padrão na Matriz

- Em modo Editar (a mesma porta única da barra da super admin), a Matriz ganha "Salvar como padrão da visão", igual às outras visões.
- Só super admin grava; o servidor confere.
- Ao abrir a Matriz, todos (cliente, parceiro, equipe) começam com esses filtros.
- O cliente pode mudar filtros só para ele, na sessão; nada é salvo para os outros.
- Matriz sem filtros padrão continua como hoje (padrão vazio).
- Testes: não super admin não grava; ao abrir, filtro padrão é aplicado; filtro do cliente não altera o padrão.

## Detalhes técnicos

- `matriz.server.ts > linhasPadrao`: hoje lê `elora_relatorio_diario` sem filtro e chama `calcularCorteCliente(..., soContatos)` com filtro. Unificar: decidir com base no diagnóstico se o caminho único é "motor sempre" ou "gravado + mesmo filtro aplicado às linhas gravadas"; a regra de filtro de outra fonte via conjunto de contatos se mantém.
- Filtros padrão da Matriz guardados no mesmo lugar das outras visões (`elora_dashboard_visoes`, via `dashboard-visoes.functions.ts`), reaproveitando o botão existente; sem tabela nova.
- Revisão final do princípio de dados incompletos (nada fixo de cliente) e listagem do que encontrar.
