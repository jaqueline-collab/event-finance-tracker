# Ajustes D/F (Parte 1 e 2) e plano da Fase 4

Nada será publicado.

## Parte 1. Resultado do diagnóstico (só leitura, já feito)

Comparei, dia a dia de 22/09 a 03/10, o relatório gravado com o cálculo de agora, sem filtro:

- Conversas, Usuário, Bot e Novos contatos: iguais nos 12 dias.
- Novos ADS: igual em 11 dias. Só **01/10** difere: **24 calculado x 23 gravado**. É o 251 x 250.

**Causa:** um contato de 01/10 (criado manualmente por uma atendente às 18:14 de Brasília, primeira conversa no mesmo minuto) ganhou a campanha do anúncio ("DR. RICARDO ASSUMPÇÃO", Instagram) só em 10/11. O relatório foi gravado em 05/11, quando ele ainda não tinha campanha.
- Não é fuso: o horário fica no meio do dia de 01/10.
- Não é regra diferente: os dois caminhos usam a mesma regra (campanha preenchida = ADS).
- Ressalva: o espelho não guarda o valor antigo da campanha. Concluo pela data de atualização do contato (10/11, depois da gravação) e por ser o único contato ADS de 01/10 com essa situação.

**Qual está certo:** o **251**. O contato veio de anúncio; o gravado ficou defasado.

## Parte 1. Correção (após seu ok)

1. Backup das linhas de 01/10 em `elora_relatorio_diario_backup`, conferência campo a campo, regravação só das linhas de 01/10 que mudarem (Novos ADS 23 → 24), consulta de restauração mostrada e não executada. Outras colunas e dias inalterados, com conferência.
2. **Uma regra só:** sem filtro e com filtro, as linhas do dia saem do mesmo cálculo e o filtro só limita o conjunto de contatos. Assim um filtro que não exclui ninguém dá exatamente o mesmo número.
3. **Teste novo:** para todos os dias do período, Matriz sem filtro = Matriz com filtro "não exclui ninguém", nas 5 colunas padrão. Sem nada fixo do Dr. Ricardo.
4. Como contatos podem ganhar campanha depois, os dias gravados também podem ficar defasados no futuro. Proposta: a sincronização incremental recalcula os dias dos contatos alterados (com backup), em vez de só gravar uma vez. Executo só se você aprovar este item.

## Parte 2. Filtros padrão na Matriz

- Em modo Editar (mesma porta única), "Salvar como padrão da visão" também na Matriz. Só super admin grava; o servidor confere.
- Todos começam com esses filtros ao abrir a Matriz. O cliente muda só para si, na sessão.
- Sem padrão salvo = como hoje.
- Testes: não super admin não grava; o padrão é aplicado ao abrir; o filtro do cliente não muda o padrão.

## Fase 4. Construtor de gráficos (só depois de você fechar os números)

**Reaproveitado (ampliar, não duplicar):** a visão e seus widgets (`elora_dashboard_visoes`, só servidor), o modo Editar e a barra da super admin, o catálogo Campos do Elora (rótulos e ocultos), o "+ Filtro" e os chips, o clique no gráfico que cria chip, o motor de indicadores e as colunas da Matriz (combinadas, manuais, fórmulas) e a marca de "estimado".

**Novo:**
- Em modo Editar, "+ Gráfico" abre um painel lateral com prévia ao vivo: fonte, medida (contagem, distinta, soma, média, tempo médio, ou indicador da Matriz), dimensão e segunda dimensão do catálogo, granularidade dia/semana/mês, ordenação, Top N com "Outros", comparação com o período anterior, formato, título e tamanho.
- Tipos: número grande, barras agrupadas e empilhadas, linhas, área, pizza, rosca, funil, tabela paginada (20 por página, ordenar, ocultar colunas) e mapa só se houver campo geográfico. Tipo sem dados para o cliente não aparece.
- Filtro próprio por cartão (mesmo "+ Filtro"), somado ao da visão; legenda liga e desliga séries.
- Grade de duas colunas, arrastar para reordenar, menu "⋯" com editar, duplicar, remover e mover para outra visão. Remover não apaga dados.
- Cálculo único no servidor: indicador da Matriz no gráfico usa a mesma função da Matriz (mesmo número). Filtro de outra fonte vira conjunto de contatos (sem duplicar linhas). Dias estimados ficam marcados e fora de totais sem marca. O texto das mensagens nunca é lido.

**Sai do painel visual atual (substituído):** os seis gráficos fixos da Fase 1 passam a ser cartões configurados criados como padrão de cada visão, com o mesmo resultado. O construtor antigo de blocos de montagem do modo Editar sai. Os "Widgets antigos" continuam guardados como rascunho e não são apagados.

**Testes:** cliente sem cards ou classificação só vê tipos e campos que existem, sem erro; dois clientes com campos diferentes têm opções diferentes; não super admin não cria nem edita (no servidor); gráfico com indicador = Matriz; filtro de outra fonte sem duplicar; dias estimados marcados.

**Entrega:** executar após seu ok, rodar os testes, conferir em 390, 834 e 1440 nos dois temas, listar o que mudou e parar.

## Detalhes técnicos

- Causa da diferença entre caminhos: `matriz.server.ts > linhasPadrao` lê `elora_relatorio_diario` sem filtro e chama `calcularCorteCliente(…, soContatos)` com filtro. Novo caminho único: `calcularCorteCliente` sempre (gravado fica como registro e referência), ou gravado sempre com recálculo quando defasado; escolho o primeiro, por dar o mesmo número nos dois casos por construção.
- Filtros padrão da Matriz: guardados como visão fixa em `elora_dashboard_visoes` via `dashboard-visoes.functions.ts`, reaproveitando o botão já existente.
- Fase 4: configuração de cartão no JSON de widgets da visão; nova função de servidor de agregação genérica reaproveitando `painel-visual.ts`, `campos-elora.ts` e `indicadores-motor.ts`.
- `roadmap.md` será atualizado com Parte 1, Parte 2 e Fase 4 ao sair do modo de plano.
