# Três pedidos: lentidão, Agenda por hora, Funil (sem publicar)

## 1) Lentidão (prioridade)

O que já confirmei no código: cada bloco que precisa de conversas chama a leitura de mensagens do espelho em páginas e conta no servidor (painel visual, Matriz/indicadores duas vezes, gráficos e Matriz por UTM). Ou seja, abrir uma visão com vários blocos repete a mesma leitura várias vezes. A leitura de conversas classificadas está na integração Elora e na lista de tabelas do construtor antigo; ainda não confirmei qual tela dispara as 153 chamadas.

Passo 0 - medição (antes de mudar qualquer coisa)
- Instrumentar temporariamente as funções do painel (contador de chamadas ao servidor e ao banco, tempo de cada uma).
- Abrir Resultados, Agenda, Agendamentos e Matriz no período 14/10 a 12/11 e montar a tabela: visão, chamadas ao servidor, chamadas ao banco, tempo de cada, tempo total de abertura.
- Guardar os números de todos os blocos desse período como referência.
- Mostro essa tabela antes de seguir para os passos a-f.

Passos
- a) Funções no banco que já devolvem as contagens prontas por dia: conversas, bot, usuário, novos contatos, ADS. O servidor deixa de baixar mensagens linha a linha. As regras continuam as da Matriz (mesmo corte, suporte interno, ignorados, primeira sessão).
- b) Um cálculo por visão e período: o servidor calcula uma vez e todos os blocos leem desse resultado.
- c) Memória curta por cliente + visão + período + filtros (poucos minutos), apagada quando a sincronização termina.
- d) Blocos de cima (indicadores) carregam primeiro; os pesados depois, cada um com seu esqueleto. O menu e os outros blocos não ficam travados.
- e) Índices: as 24 chaves estrangeiras sem índice e cliente_id + data + sessão nas tabelas espelho (mensagens, atendimentos, contatos, cards).
- f) Tirar a leitura de conversas classificadas do caminho de abertura do painel (fica só onde é usada de fato).

Regras
- Um só caminho de cálculo para Matriz, blocos e gráficos; não volta a ler o relatório gravado.
- Nenhum número muda: comparo todos os blocos de 14/10 a 12/11 antes e depois. Se algum diferir, paro e mostro, sem seguir.
- Entrego a tabela de tempos de abertura antes x depois das quatro visões.

## 2) Agenda por hora

- Na lista da Agenda, novos modos: "Dia" e "Semana" (o "Mês" atual continua).
- Régua com uma faixa por hora. O intervalo vai da hora do primeiro compromisso do período até a do último, nada fixo no código.
- O compromisso fica na altura exata do horário (11:30 fica no meio entre 11:00 e 12:00).
- Compromissos no mesmo horário ficam lado a lado, dividindo a largura.
- Cores do calendário: consulta em amarelo, procedimento em verde. O filtro por tipo continua valendo.
- Clicar abre os mesmos detalhes de hoje.
- Compromisso sem hora fica numa faixa "Sem horário" acima da régua, nunca some.
- Semana: sete colunas com a mesma régua. No celular, vira um dia por vez com setas.

## 3) Funil

- Faixas em trapézio empilhadas e centradas, todas da mesma altura, estreitando para baixo.
- Dentro de cada faixa: nome da etapa pequeno e valor grande em negrito, centrados.
- Painel à direita com a conversão final em destaque (ex.: "Conversão em vendas 44,4%") e uma nota curta. No celular, o painel vai para baixo do funil.
- Cores só da paleta de gráficos da marca (marinho, azul médio, azul claro, âmbar, cinza, amarelo), com texto em contraste AA em cada faixa. Amarelo e âmbar levam texto marinho.
- Nome longo é cortado com reticências e mostra o nome inteiro ao passar o mouse ou tocar; nunca se sobrepõe.
- Vale para os dois modos: Etapas (conversão entre etapas, final = última / primeira) e Ranking (% do total, destaque = maior item).

## Ordem e entrega
1. Medição (passo 0) e a tabela.
2. Passos a-f, depois comparação dos números e dos tempos.
3. Agenda por hora.
4. Funil.
5. Testes (números iguais, posição por hora, sobreposição lado a lado, contraste do funil), conferência em 390/834/1440 nos dois temas onde eu conseguir abrir. Não publico.

## Detalhes técnicos
- Funções SQL (security definer, só service role, recebem cliente_id e período) para agregação por dia/sessão; a lógica de corte continua num único módulo, e os testes comparam a saída SQL com o motor atual em todos os dias.
- Contexto por requisição + cache em memória do worker com chave (cliente, visão, período, hash dos filtros) e versão vinda de `elora_sync_estado` para invalidar.
- Blocos viram consultas separadas no TanStack Query, prioridade aos KPIs.
- Agenda: posição = (minutos - início) / minutos por hora × altura da faixa; agrupamento de sobrepostos por colunas.
- Funil: SVG com polígonos e `<title>`, cores a partir dos tokens `--chart-*`.
