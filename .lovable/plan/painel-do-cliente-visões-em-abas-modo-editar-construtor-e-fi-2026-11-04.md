# Painel do cliente: visões em abas, modo Editar, construtor e filtros

Três etapas, cada uma parando para você conferir. Nada é publicado sem você pedir. Ficam de fora: cálculos financeiros, fechamentos, movimentos, cofre, relatório diário (n8n) e `listar-clientes`. Nenhum gráfico existente é apagado. Nada de "Em breve", botões desativados ou interruptores travados.

## Etapa V1: visões em abas e modo Editar (esta rodada)

**O que muda para quem vê**
- A aba Painel da Área do cliente mostra as visões publicadas em abas no topo. Se houver só uma visão, aparece sem barra de abas.
- O cliente, o parceiro e a equipe comum veem só as visões publicadas, sem nenhum controle de edição.
- Hoje cada cliente ganha a visão "Resultados", publicada, com os gráficos atuais. O que o cliente vê não muda.

**Para você (super admin)**
- O botão "Editar" fica ao lado das abas e substitui o "+ Nova visão" desativado. O botão Configurar continua igual.
- No modo Editar:
  - todas as visões aparecem, e as que não estão publicadas levam o selo "Rascunho";
  - "+" cria uma visão nova;
  - duplo clique renomeia;
  - arrastar reordena;
  - há opção de duplicar;
  - excluir pede confirmação e mostra quantos gráficos a visão tem;
  - o interruptor "Visível ao cliente" publica ou volta a visão para rascunho.
- A barra "Salvar / Cancelar" grava tudo de uma vez ou descarta o que você mudou nesta edição. Ao sair, o painel volta à leitura limpa.

**Testes V1**
- Cliente, parceiro e equipe comum não veem Editar nem rascunhos, e o servidor recusa se tentarem gravar.
- O backfill (transferência dos gráficos atuais para a visão "Resultados") preserva todos os gráficos.
- Uma visão publicada aparece e um rascunho não.
- Reordenar e excluir visão funcionam.
- A suíte atual continua passando.

## Etapa V2: construtor de gráficos (próxima rodada)
- Uma barra lateral substitui o formulário atual de gráfico.
- O construtor vai por passos: Fonte, Filtrar, Resumir, Agrupar, Ordenar/limitar, Visualização (12 tipos, com sugestão automática) e Aparência.
- A pré-visualização é ao vivo e mostra as 10 primeiras linhas.
- Os 6 tipos atuais continuam funcionando com as configurações já salvas.
- Arrastar e redimensionar só funcionam no modo Editar. O limite é de 30 gráficos por visão, com aviso.
- Toda consulta é filtrada no servidor pelo cliente da visão.

## Etapa V3: filtros do painel (rodada seguinte)
- Em modo Editar, "+ Filtro" cria um filtro com rótulo, tipo, operador, seleção única ou múltipla, valor padrão e opção de obrigatório.
- Cada filtro pode valer para toda a visão ou só para gráficos escolhidos, e a ordem muda arrastando.
- Quem vê o painel encontra uma barra de filtros no topo, com aplicar automático ou botão Aplicar, e Limpar.
- A escolha do visitante vale só para a sessão dele e não muda o que está salvo.
- Só são oferecidos valores dos dados do próprio cliente.
- A página incorporada, se já existir, mostra as mesmas visões e filtros, só para leitura.

## Detalhes técnicos (V1)

**Migração**
- Nova tabela `public.elora_dashboard_visoes`:
  - colunas: `id`, `cliente_id` (FK `elora_clientes` ON DELETE CASCADE), `nome`, `ordem`, `publicada` (padrão false), `filtros` jsonb (padrão `[]`), `criado_em`, `atualizado_em` (com gatilho de atualização);
  - acesso: GRANT só para `service_role` e REVOKE de anon/authenticated. RLS ligada, sem política para usuários: a leitura e a escrita passam só pelo servidor.
- `elora_dashboard_widgets.visao_id` uuid null (FK para visões, ON DELETE CASCADE).
- Backfill: cria a visão "Resultados" (publicada, ordem 0) para cada cliente com gráficos e aponta esses gráficos para ela.

**Servidor**
- Arquivo novo `src/lib/dashboard-visoes.functions.ts`:
  - `listarVisoesCliente`: leitura com as mesmas regras de acesso de `getResultadosCliente`. Lê pelo admin, filtra pelo `cliente_id` e devolve só as publicadas. O super admin, com `incluirRascunhos`, recebe todas.
  - `salvarVisoesCliente`: grava em lote nome, ordem, publicada, novas e excluídas. Duplicar copia os gráficos para a nova visão.
  - `garantirVisaoPadrao`: cria "Resultados" publicada quando o cliente ainda não tem nenhuma visão.
  - Todas as escritas usam `exigirSuperAdmin`.
- `getResultadosCliente` recebe `visaoId` opcional:
  - com `visaoId`, filtra os gráficos daquela visão e confere que ela pertence ao cliente;
  - sem `visaoId`, usa a primeira visão publicada;
  - para quem não é super admin, um rascunho é recusado.
- `dashboard-widgets.functions.ts`: salvar, excluir, reordenar e grade passam de `exigirEquipeInterna` para `exigirSuperAdmin`.
  - `salvarWidgetCliente` passa a receber `visaoId`. Sem ele, usa a visão padrão.
  - Aplicar modelo grava os gráficos na visão padrão.

**Interface**
- `src/routes/area-do-cliente.index.tsx`: barra de abas das visões e botão Editar só com `isAdmin`. O estado da edição fica local até Salvar.
- Componente novo `src/components/visoes-painel.tsx`: abas, arrastar com `@dnd-kit` (se já instalado; senão, setas de ordem), renomear, duplicar, excluir e o interruptor.

**Testes**
- `src/lib/__tests__/dashboard-visoes.test.ts`: regras puras de ordenação e visibilidade.
- Testes de RLS integrados para rascunho e para negação a quem não é super admin.
