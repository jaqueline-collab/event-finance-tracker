# Fase 6 — Edição bloco a bloco, Calendário e assistente de configuração

Princípio mantido: tudo por cliente, padrão vazio, nada fixo no código, ausente = "Não definido", ampliar o que existe. Tokens visuais atuais. Não publicar.

## 1. Inventário de "Listas e filtros padrão da conta" (leitura feita)

A seção grava 6 colunas na conta de integração do cliente. Quem lê cada uma hoje:

| Item | Onde está guardado | Quem lê hoje | Destino |
|---|---|---|---|
| Usuários | `filtro_usuarios` | Só a própria tela de Configurar | Sai a edição. Coberto por "+ Filtro" (atendente) e catálogo |
| Etiquetas | `filtro_etiquetas` | Só a própria tela | Sai a edição. Coberto por "+ Filtro" (etiquetas do contato) |
| Campo personalizado e valor | `filtro_campo_personalizado` | Só a própria tela | Sai a edição. Coberto pelo catálogo Campos do Elora + "+ Filtro" |
| Painel de Vendas | (só seleção na tela, não grava) | Ninguém | Sai |
| Campanha patrocinada | `filtro_campanha` | Só a própria tela | Sai a edição. Regra de ADS já vive no motor (UTM/origem), não usa esta coluna |
| Etapas do funil | `filtro_etapas_funil` | Só a própria tela | Sai a edição. Coberto pelos indicadores da Matriz (etapa de card) |

Conferido também: indicadores (`elora_indicadores_config`), regra de ADS, Matriz, gráficos, sincronização, Elora IA e as rotas do n8n (`registrar`, `listar-clientes`, `sync-cards`) não leem nenhuma dessas colunas. O construtor antigo de widgets lê filtros do próprio widget, não da conta (e o Dr. Ricardo tem zero widgets antigos em produção).

Resultado: nada alimenta cálculo, então nada migra para a regra de indicadores. Sai a seção da tela e a função `salvarFiltrosCliente`; a leitura passa a não devolver esses campos. **As colunas e os valores salvos ficam intactos no banco** (nenhum dado apagado), sem nenhuma tela para eles.

Teste: Matriz e gráficos dão os mesmos números antes e depois da remoção.

## 2. Edição bloco a bloco com redimensionamento

- Todo bloco da visão vira cartão da grade, incluindo os 4 indicadores do cabeçalho (passam a ser cartões tipo "número" padrão, mesma regra do painel, sem segunda regra de métrica).
- Modo Editar (só super admin; servidor recusa): barra no bloco ao passar o mouse com editar, duplicar, remover e mover para outra visão (menu "⋯" existente).
- Grade de 12 colunas com encaixe: largura de 3 a 12, altura em múltiplos da linha, mínimo/máximo por tipo. Alças nas bordas e canto. Abaixo de 834 px o bloco ocupa a largura toda e não redimensiona.
- Arrastar para reordenar entre linhas (dnd-kit já instalado).
- Desfazer/refazer na sessão de edição; "Restaurar layout padrão da visão".
- Layout gravado por visão e cliente dentro da própria visão; cliente vê só o resultado.

## 3. Bloco Calendário

- Novo tipo no construtor: fonte (Contato, Atendimento, Card, UTM), campo de data do catálogo, medida (contagem, soma ou média de outro campo), filtros próprios com "+ Filtro".
- Mês em grade (opções semana e lista de agenda), intensidade por quantidade/valor, navegação por mês e "Hoje".
- Clique no dia: lista com nome, telefone, atendente, valor e campos escolhidos, respeitando o que quem vê pode ver; parceiro sem permissão de valores não vê valores.
- Dias estimados com a marca existente; dia sem sincronização = "aguardando", nunca zero.
- Cliente sem campo de data no catálogo não vê o tipo.

## 4. Assistente de configuração (Elora IA, modo administrador)

- Mesmo painel, servidor e ferramentas de leitura da Elora; modo só aparece em Editar para super admin e o servidor só ativa com `is_admin`.
- Lê catálogo e definições do cliente e sugere mapeamentos com motivo e fonte; pergunta se o mesmo nome existir em duas fontes.
- Monta blocos/colunas sob pedido como **proposta** com prévia ao vivo; só "Aplicar" grava, revalidando super admin.
- Escrita limitada a: blocos e layout, colunas da Matriz, indicadores, rótulos/ocultações do catálogo, filtros padrão da visão — sempre do cliente aberto. Nunca dados do Elora, mensagens, chaves ou outro cliente.
- Cada aplicação registrada (quem, quando, o que, valor anterior) com "Desfazer".
- Elora do cliente e do parceiro continua sem nenhuma ferramenta de escrita. Dados do banco seguem embrulhados como dado. Limite diário e modelo como hoje.

## 5. Testes

Servidor recusa não super admin (bloco, layout, modo administrador); proposta não grava sem Aplicar; assistente não grava dado do Elora nem outro cliente; Elora do cliente sem escrita; remoção da seção não muda Matriz/gráficos; Calendário some sem campo de data; dias estimados e "aguardando" marcados; redimensionar/restaurar não afeta outro cliente; cliente sem cards/classificação sem erro.

Depois: conferência em 390, 834 e 1440 nos dois temas (a parte logada continua dependendo de sessão no banco externo), lista do que saiu, sem publicar.

## Detalhes técnicos

- Layout: campos `col`, `largura`, `altura`, `ordem` no `cartaoSchema` (`graficos.ts`), dentro de `elora_dashboard_visoes.filtros.cartoes`; grava só por `graficos.functions.ts`/`dashboard-visoes.functions.ts` com `exigirSuperAdmin`. Restaurar = recompor a partir de `CARTOES_PAINEL` + tamanhos padrão por tipo.
- Indicadores do cabeçalho: novos cartões padrão em `CARTOES_PAINEL` delegando a `cartaoDoPainel`.
- Calendário: tipo `calendario` em `TIPOS_GRAFICO`, agregação pura em `graficos.ts` (balde por dia do campo de data), detalhe do dia por função de servidor que nunca lê texto de mensagem; cobertura via `sync-cobertura.ts`.
- Assistente: flag `modo: 'admin'` em `/api/elora-ia`, resolvido em `elora-ia.server.ts`; ferramentas de proposta devolvem JSON validado por Zod; aplicação em nova função de servidor que chama as mesmas funções de escrita já existentes.
- Nova tabela `elora_config_acoes` (cliente_id, usuário, quando, alvo, antes, depois), RLS ligado sem policy, só servidor; usada para Desfazer.
- Remoção: bloco da seção em `configurar-api-cliente.tsx`, `salvarFiltrosCliente` e campo `filtros` de leitura em `integracao-elora.functions.ts`; colunas da tabela intocadas.
