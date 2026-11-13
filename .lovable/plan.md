# Desempenho do painel e da Matriz (passos a–f)

Sem publicar. Se algum número mudar em relação ao guardado, paro e mostro, sem gravar.

## 1. Retrato antes (nenhuma mudança de cálculo)
- Guardar os números de todos os blocos de Resultados, Resultados (novo), Agenda, Agendamentos e da Matriz inteira (todas as colunas e todos os dias) para 14/10–12/11 e 22/09–03/10, cliente Dr. Ricardo.
- Guardar também o tempo de abertura de cada visão (Resultados, Agenda, Agendamentos, Matriz), sem cache.
- O retrato fica em arquivo de referência e vira teste de comparação, rodado depois de cada passo.

## 2. Mesma leitura e mesmo motor (painel e Matriz)
- Uma leitura única por requisição, com mensagens lidas uma vez e repartidas entre painel e Matriz.
- Contagem por dia (conversas, bot, usuário, novos contatos, ADS) feita por funções SQL no banco, que devolvem só os totais por dia/dimensão, sem trazer linhas.
- As funções seguem as regras atuais: suporte interno e ignorados, primeira sessão do contato, IMPORTED fora, "Não definido" para ausentes e fuso de Brasília.
- Somente leitura, chamadas apenas pelo servidor, sem acesso direto pela API.

## 3. Um cálculo por visão
- Cada visão pede seus dados uma vez. O servidor calcula o conjunto e reparte o resultado entre os blocos, em vez de cada cartão recalcular.

## 4. Cache curto
- Chave: cliente + visão + período + filtros + "versão da sincronização".
- A versão muda quando a sincronização termina. Assim, depois de uma sincronização, nenhum número antigo é servido.
- Validade curta (alguns minutos), guardada no banco, só servidor, sem dinheiro para quem não tem permissão.

## 5. Ordem de carregamento
- Primeiro os indicadores do topo, depois os blocos pesados (Matriz por UTM, tabela de itens, calendário).
- Esqueleto por bloco. O menu e o restante da tela nunca desmontam.

## 6. Índices e conversas classificadas
- Confirmar, nos registros de consultas, de onde vêm as 153 chamadas de cerca de 790 ms às conversas classificadas, e tirá-las do caminho de abertura.
- Criar só os índices que faltam nas tabelas de espelho. Conferir que o banco passa a usá-los.

## 7. Meta e relatório
- Meta: abrir qualquer visão em menos de 3 s sem cache e em menos de 1 s com cache.
- Relatório com tabela antes/depois dos números (os dois períodos) e dos tempos por visão.
- Também listo o que não atingiu a meta e por quê.
- Observação: o login depende do banco externo, por isso os tempos serão medidos no servidor, por visão. A conferência na tela logada fica com você.

## Detalhes técnicos
- Funções SQL `security definer`, `search_path` fixo, sem GRANT para anon/authenticated. Executadas via service role dentro de `painel-visual.server.ts`/`matriz.server.ts`, que passam a usar um carregador comum.
- A tabela de cache fica com RLS ativa e sem policy. A versão da sincronização vem de `elora_sync_estado`.
- Índices criados por migração simples, sem CONCURRENTLY.
- Teste de regressão com o retrato do passo 1. Os testes existentes continuam passando.
