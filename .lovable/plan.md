# Fase 5 — Limpeza e acabamento

## Limites e ordem

Executar somente depois da aprovação deste plano, na ordem abaixo. **Não publicar.** Nenhum dado financeiro, mensagem, widget antigo, relatório ou backup será apagado. “Widgets antigos” continua rascunho, sem acesso do cliente. A edição continua entrando por um único botão **Editar**, na barra da super admin.

Toda configuração continua por cliente, com padrão vazio; dimensões ausentes continuam “Não definido”. Não exigir cards, equipes, UTMs ou outro recurso para abrir ou calcular o painel. Mensagens continuam sem texto no navegador.

## 1. Comparar antes de substituir os seis gráficos fixos

Ampliar os cartões do construtor existente e criar as configurações padrão das visões sem sobrescrever cartões ou filtros já salvos. Preservar títulos, séries, ordenação, tamanhos, campos, ocultações e interação de filtro. Não criar valores ou regras específicos de um cliente no código.

| Gráfico atual | Conferência exigida no cartão novo |
|---|---|
| Leads por dia | Cada dia, Sem campanha e ADS |
| Leads por | Cada fatia, total e percentual; conferir todas as dimensões do seletor |
| Conversas por dia | Cada dia, Usuário do sistema e Bot |
| Principais campanhas | Cada campanha, quantidade e ordem do top 8 |
| Atendimentos por canal | Cada canal e quantidade |
| Conversas por atendente | Cada atendente e todas as colunas da tabela |

Comparar na conta do Dr. Ricardo com o mesmo período e filtros: 22/09–03/10/2026, outubro completo e ao menos um recorte não vazio. Conferir também filtro que não exclui ninguém, importados fora da conta por padrão, dimensões ausentes e período anterior quando usado.

**Porta de segurança:** produzir e mostrar a tabela `gráfico / período / filtro / categoria / série / fixo / novo / diferença` antes de retirar os fixos. Só substituir os que forem idênticos em todos os valores comparados; diferença não pode ser escondida por arredondamento. Se houver divergência, corrigir o cartão e repetir a comparação, ou manter o fixo e informar a pendência. Não mudar o cálculo validado da Matriz para forçar igualdade.

Depois da igualdade, retirar a renderização fixa e os estados, importações e funções que ficarem realmente órfãos. Manter os quatro indicadores do cabeçalho e um só período e “+ Filtro” por visão.

## 2. Retirar a aba Relatório diário sem perder funções

Remover a aba fixa e seu caminho de seleção no painel; a Matriz passa a ser a única tabela diária. Não apagar `elora_relatorio_diario`, backups ou funções usadas fora dessa aba.

**Dependências encontradas e destino:**

| Dependência atual | Tratamento |
|---|---|
| Área do cliente e `VisoesPainel` | Remover conteúdo, seleção e condições exclusivas da aba antiga |
| `SecaoRelatorioDiario` | Revisar período, ordenação, agrupamento, exportação PDF/Excel e congelamento antes de retirar a tela |
| Relatórios congelados | Preservar registros e leitura; levar acesso/ações ainda necessários à Matriz, dentro do controle existente, sem uma segunda tabela |
| Filtros e preferências da tabela antiga | Não apagar dados salvos; reutilizar o que for compatível com Matriz/“+ Filtro”, informando o que não tiver equivalência |
| `/api/public/relatorio-diario/registrar` e `/listar-clientes` | Manter endereços, segurança e contrato da automação externa |
| `getRelatorioDiarioCliente`, recálculo e backups | Manter consumidores necessários; remover somente código sem consumidor |
| Elora IA, totais por dimensão | Manter leitura autorizada pelo cálculo existente; atualizar referência à tela sem confundir registro gravado com cálculo atual |
| `/relatorio-validacao` | Absorver a comparação na Matriz em modo Editar e redirecionar o endereço antigo, preservando cliente e permissão |

Inventariar todos os consumidores antes da remoção e testar a automação sem gravar registros de teste em produção.

## 3. Estimativas e dias sem sincronização

- Trocar a etiqueta repetida por ponto discreto com tooltip: **“Valor estimado: o Elora não guarda quando o card mudou de etapa antes de dd/mm”**. Usar a data real da primeira leitura aplicável ao cliente/card, nunca uma data fixa.
- Tooltip acessível também por foco/toque e uma única nota no rodapé da tabela. Mesmo ponto no total quando ele incluir dias estimados. Aplicar o padrão aos cartões que exibem estimativa, preservando os respectivos critérios de totalização.
- Nenhum cálculo, inclusão ou exclusão de estimados muda.
- Distinguir **zero confirmado**, **aguardando sincronização** e **parcial** usando evidências da sincronização das fontes necessárias. Ausência de registros não prova zero nem falta de sincronização.
- Conferir se o estado/cursor atual prova cobertura diária. Se não provar, ampliar o registro de cobertura por fonte/cliente, sem inventar cobertura histórica. Valores incompletos ficam identificados; nunca um zero apresentado como confirmado. Estados propagam para totais e gráficos sem mudar as regras numéricas.

## 4. Unificar as quatro duplicidades do levantamento

O histórico recuperado listava seis candidatos; os quatro primeiros são os quatro tratados aqui. Os gráficos antigos e a localização das regras, os outros dois, entram na limpeza dos itens 1 e 4 sem apagar widgets.

1. **Validação × Matriz:** incorporar comparação calculado/gravado na Matriz, só super admin em modo Editar; endereço antigo redireciona. Preservar a possibilidade de conferir divergências, não apenas retirar a página.
2. **Catálogo duplicado:** “Campos do Elora” permanece o catálogo único. Matriz, validação e construtor o consomem com os mesmos rótulos e ocultações; retirar a listagem paralela da validação.
3. **Suporte interno global dentro do cliente:** mover a edição da lista para a administração geral existente, só super admin. Dentro do cliente ficam apenas ignorados extras e mapa de equipe, com referência à lista global, sem outro editor global.
4. **Dados do cliente em Configurar API × painel lateral:** centralizar conexão, canais e campos do cliente no painel lateral existente; entradas antigas redirecionam para ele. Configurar API mantém somente administração geral. Regras do cliente ficam no controle existente, sem segundo editor de indicadores.

Cliente de fonte antiga continua atendido pelo caminho compatível; não retirar seu construtor necessário só porque o cliente com espelho já usa cartões novos.

## 5. Ranking de atendentes na Elora IA

Conferir outubro/2026 do Dr. Ricardo: o resultado citado de **1.447 para Vinicio** versus **744 Usuário do sistema no mês** não será tratado como prova nem corrigido por suposição.

- Rastrear a atribuição por atendente no cálculo e comparar, por atendente e no mês, conversas totais, com humano e só bot; respeitar suporte interno/ignorados e “Não definido”.
- Se o ranking total incluir conversas só bot atribuídas ao atendente, devolver essa informação junto dos dados da ferramenta e fazer a resposta explicitar isso, oferecendo separar **“atendidas por ele”** e **“pelo bot”**.
- Não chamar responsabilidade atribuída de participação humana comprovada. Se o cálculo só provar que houve algum humano na conversa, dizer isso, sem atribuir a autoria a esse atendente.
- Preservar permissões, limites e bloqueio de conteúdo de mensagens.

## 6. Medir desempenho e listar segurança, sem alterações de segurança

**Desempenho:** medir abertura da Matriz para 30, 90 e 180 dias no Dr. Ricardo, com mesmos filtros/colunas e data final declarada. Separar tempo de cálculo, resposta e tabela pronta, com primeira abertura e pelo menos três repetições; apresentar mediana, variação e volume. Informar se cache é necessário e qual invalidação exigiria. Não implementar cache nesta fase sem necessidade demonstrada e autorização adicional.

**Segurança:** buscar a lista atual dos avisos do banco conectado e apresentar cada aviso por gravidade, objeto e motivo, separando tabelas/objetos do EloraCRM dos demais; marcar objetos sem origem confirmável. Conferir se ainda são 43 e explicar diferença de quantidade. **Só leitura: não alterar grants, políticas, funções ou avisos; não ocultar achados.**

## 7. Testes, conferência e entrega

- Testes de igualdade de todos os valores dos seis gráficos, filtros e exclusão padrão de importados; preservar o teste de todos os dias e cinco colunas padrão da Matriz.
- Testes dos estados aguardando/parcial/zero confirmado, fontes opcionais e clientes com estruturas diferentes. Estimativas mantêm os mesmos valores e totais.
- Testes de permissões: cliente não grava configurações; rascunho não vaza; parceiro sem permissão não recebe valores financeiros; automação mantém contrato e proteção.
- Testes de ranking com conversa humana e só bot atribuídas ao mesmo atendente, sem fixar pessoas reais nos testes.
- Conferir a experiência em **390, 834 e 1440 px, temas claro e escuro**: abrir visão, período, filtros, Matriz, Editar, cartões, tooltip, comparação e rascunhos.
- O projeto usa Supabase externo: a conferência logada exige uma sessão autorizada disponível. Se continuar indisponível, declarar exatamente os fluxos não verificados; não usar acesso privilegiado para fabricar sessão nem apresentar tela vazia como validação.
- Entregar tabela comparativa dos seis gráficos, verificação do ranking, tempos, avisos de segurança, testes e lista exata do que saiu/foi preservado. Listar suposições específicas de cliente encontradas e corrigidas.

**Ao terminar, parar e mostrar. Não publicar.**

## Detalhes técnicos

- Ampliar `graficos.ts`, `graficos.functions.ts` e `cartoes-graficos.tsx`; manter cartões em `elora_dashboard_visoes.filtros.cartoes`, catálogo único e filtros existentes.
- Limpeza em `painel-visual.tsx`, `visoes-painel.tsx`, `area-do-cliente.index.tsx` e consumidores de `resultados-cliente.tsx`, após a porta de comparação.
- Estimativa/cobertura em Matriz e cartões; cobertura derivada das fontes/cursor ou registro adicional mínimo se faltar evidência, com grants e acesso só servidor quando necessário.
- Comparação reutiliza as funções existentes de validação e o caminho único de `matriz.server.ts`; ranking amplia `elora-ia-ferramentas.ts` e instruções existentes.
- Revisar metadados das páginas tocadas e atualizar decisões estruturais em `AGENTS.md` durante a execução.