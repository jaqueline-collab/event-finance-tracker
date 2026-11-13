# Correções das visões + Fase 7 (uma entrega em 3 etapas, sem publicar)

Onde as correções e a Fase 7 se sobrepõem, vale a Fase 7. A exceção são os ajustes que você mandou por último sobre o Calendário e os números da Agenda.

## Levantamento: o que aparece fora dos blocos da visão

Não conto a barra de período, o "+ Filtro", o aviso de atualização e as abas.

| Visão | O que aparece fora dos blocos | Onde está no código |
|---|---|---|
| Agenda (e qualquer visão sem cartões `kpi-*`) | Os 4 cartões fixos do topo | `src/components/painel-visual.tsx:224` (`<Indicadores>`, ~300–320), ligado por `kpisNaGrade` em `src/routes/area-do-cliente.index.tsx:566` |
| Todas | "parcial · cobertura diária não confirmada" no topo | `painel-visual.tsx:225` |
| Todos os blocos | O mesmo aviso repetido em cada bloco | `src/components/cartoes-graficos.tsx:304` |
| Resultados | Nada além do acima (os 4 indicadores já são blocos) | — |
| Matriz | Só a própria tabela, sem nenhum cartão de número | `area-do-cliente.index.tsx:330` |

## Etapa 1: blocos e correções

1. **Topo fixo removido.** O componente `Indicadores` e a opção `kpisNaGrade` são apagados. Todo bloco de toda visão passa a ter barra (editar, duplicar, remover, mover para outra visão), alças de redimensionar e arrastar.
2. **TMR e TMA em dois blocos.** Cada um tem seu valor, sua variação e "N conversas medidas".
3. **Migração da Agenda.** Os blocos entram na linha do topo com 3 colunas cada, e o TMA vai para a linha de baixo se não couber. O estado anterior fica guardado em `elora_config_acoes`, com Desfazer. Antes e depois, na mesma visão e no mesmo período, os números têm de ser idênticos: Novos leads 1.187, Conversas 2.326, Leads de ADS 921 e o TMR. Se algum número mudar, eu paro e te pergunto antes de gravar. O relatório mostra a tabela de antes e depois.
4. **Variação legível.** Usa os tokens de sucesso, alerta e neutro, com contraste AA nos dois temas. Sem nenhum hex fora do `styles.css`.
5. **Aviso de cobertura uma vez só.** Uma única linha no topo da visão. Nos blocos, só um ponto discreto com explicação ao passar o mouse, e só quando o bloco depende de um dia sem cobertura.
6. **Calendário.** Título padrão "Agendamentos", editável. Dia futuro fica vazio. Dia passado sem registro fica vazio, sem 0. O ponto com explicação aparece só em dia sem cobertura, sem a palavra "aguardando" escrita nas células.
7. **Funil.** Segue o estilo do Elora App da Fase 7 (detalhado na Etapa 2). Mostra as 8 maiores e junta o resto em "Outras". Nada de nome sobreposto: quando o nome não cabe, ele é cortado e aparece inteiro ao passar o mouse.

Ao final da Etapa 1: testes e conferência.

## Etapa 2: novos tipos de bloco (genéricos)

- **Número com comparação:** uma medida do catálogo ou da Matriz contra o período anterior, com % e seta. Os blocos do topo passam a usar este tipo.
- **Dois valores:** uma soma e uma contagem no mesmo bloco, com comparação opcional.
- **Barras empilhadas por dia:** até 3 medidas que quem vê pode alternar, sem gravar nada.
- **Pizza por dimensão:** com % e total.
- **Funil Elora App:** faixas centradas e decrescentes, com nome, valor e quantidade, e a conversão entre uma faixa e a seguinte. Tem dois modos, Etapas e Ranking (o Ranking soma 100%), e mostra o dia considerado.
- **Matriz agrupada por UTM:** a super admin escolhe as UTMs que agrupam. Colunas: novas conversas, novos contatos e % do total, com linha de total, 20 linhas por página, ordenar, ocultar colunas e a opção "só patrocinados".
- **Tabela de itens:** uma linha por contato ou card, com colunas do catálogo, etiquetas coloridas, ordenar, agrupar, ocultar, "+ Filtro" próprio, paginação e exportar. Inclui a coluna calculada "Origem", pela mesma regra de ADS do motor.
- **Calendário:** vários campos de data, que quem vê alterna sem gravar.

Um tipo sem dados no cliente não aparece na lista. Dia estimado mantém a marca de hoje. Parceiro sem permissão não vê valores.

## Etapa 3: visões do Dr. Ricardo (rascunho, "Visível ao cliente" desligado)

Tudo é gravado pelas funções do construtor, com registro e Desfazer. Antes, guardo o estado atual da visão Resultados.

- **Resultados:** novos contatos, novas conversas, TMR e TMA (números com comparação); barras por dia de novos contatos e ADS, com alternância para conversas; pizza de contatos por canal; funil Ranking das campanhas patrocinadas; Matriz por UTM.
- **Agenda (a que já existe):** Calendário com a Data da consulta do card e alternância para a Data do procedimento.
- **Agendamentos (nova):** dois blocos "Dois valores" (consultas agendadas e procedimentos vendidos) e a tabela de itens com as colunas abaixo.

### Colunas do monday x campos do Elora do Dr. Ricardo (lido agora no espelho)

| Coluna do monday | Campo do Elora | Situação |
|---|---|---|
| Nome | contato `name` | encontrado |
| Telefone | contato `phoneNumberFormatted` | encontrado |
| Origem (patrocinado/orgânico) | coluna calculada pela regra de ADS | calculado |
| Canal | canal da 1ª sessão do contato | encontrado |
| Procedimento de interesse | card `procedimento-34` (1.924 cards); contato `procedimento-interes` (7 contatos) | encontrado (duas fontes, você escolhe) |
| Status do lead | card `stepTitle` (etapa) / `status` | encontrado |
| Compareceu | — | não encontrado |
| Data da consulta | card `data-da-consulta` (86) | encontrado |
| Valor da consulta | card `valor-da-consulta` (29) | encontrado |
| Data do procedimento | card `data-do-procedimento` (97) | encontrado |
| Valor do procedimento | card `monetaryAmount` (valor do card) | provável, a confirmar |
| UTM origem | utm `source` (1.607) | encontrado |
| UTM campanha | utm `campaign` (1.607) | encontrado |
| UTM URL de referência | utm `referralUrl` (1.606) | encontrado |
| Data consulta fechada | — | não encontrado |
| Data procedimento fechado | — | não encontrado |
| ID do card | card `number` / `id` | encontrado |

Só entram as colunas encontradas. As três que não existem ficam de fora até você decidir. "Agência" e "OBS" não entram.

## Testes (rodados a cada etapa)

- O painel falha no teste se mostrar um cartão de número fora de `elora_dashboard_visoes`.
- Todo bloco tem barra e alças em modo Editar.
- Os números da Agenda são os mesmos antes e depois da migração.
- O número de cada bloco com indicador é igual ao da Matriz.
- Alternar a medida ou o campo de data não grava nada.
- A Matriz por UTM soma o total de novas conversas, e o funil Ranking soma 100%.
- Funil com 8 maiores + "Outras" e a soma certa.
- Calendário: dia futuro e dia passado vazios, ponto só em dia sem cobertura.
- Cada tipo funciona com um cliente sem cards e sem UTM.
- Parceiro sem permissão não vê valores.
- O teste de cores da marca continua valendo.

## Conferência e prova

A cada etapa, confiro em 390, 834 e 1440, nos dois temas. Só a tela sem login pode ser vista, porque o banco externo não permite uma sessão de teste. No relatório, indico arquivo e linha que provam que cada visão só mostra os blocos dela, e a tabela de antes e depois da Agenda. Não publico.

## Decisões e ajustes aprovados (valem sobre o texto acima)

- **Procedimento de interesse:** vem do card (`procedimento-34`).
- **Valor do procedimento:** entra com o rótulo "Valor do card" (`monetaryAmount`) até você confirmar.
- **Fora da tabela:** Compareceu, Data consulta fechada e Data procedimento fechado.
- **Origem:** pela regra de ADS do motor.
- **A. Resultados:** a visão atual não muda. Eu crio "Resultados (novo)" como cópia em rascunho, com "Visível ao cliente" desligado, e a atual fica intacta até você aprovar a troca.
- **B. Agenda:** os 4 indicadores migrados na Etapa 1 continuam e o Calendário é acrescentado. Nenhum bloco é removido.
- **C. Outros clientes:** a migração da Etapa 1 vale para todas as visões de qualquer cliente que hoje mostram o cabeçalho fixo. Antes de gravar, listo quais visões e quais clientes serão alterados. Só gravo depois que os números de antes e depois baterem.
- **D. Número diferente:** se qualquer número mudar em qualquer migração, eu paro e te pergunto, sem gravar.
- **Relatório:** um ao fim de cada etapa. Não publico.
