# Textos do ícone "i" — lista corrigida (nada gravado)

Regras gerais: dias e horários no horário de Brasília. Linguagem simples, sem "UTM" e sem "sincronização". Uma parte sem conteúdo não aparece no balão. Os filtros em vigor entram sozinhos no fim do balão.

## Conferências pedidas (pelo código e pela configuração atual do Dr. Ricardo)
1. **Bot** = Conversas realizadas menos Usuário do sistema. **Inclui conversas que ninguém respondeu.** O texto foi trocado.
2. **Consulta Agendada e Procedimento Vendido**: o dia é aquele em que o sistema viu pela primeira vez o card na etapa "Agendados" com a data preenchida. **A data da consulta e a data do procedimento não definem o dia**: elas só precisam estar preenchidas. **As duas colunas valem para a mesma etapa, "Agendados"**; o que muda é qual data precisa estar preenchida. Se a data for preenchida depois da entrada na etapa, o card conta no dia em que ela foi preenchida.
3. **Atendente: há uma diferença entre telas que precisa da sua decisão** (veja o fim).
4. **Cores**: o amarelo das consultas e o verde dos procedimentos batem com o calendário real.

## Relatório diário (colunas)
| Coluna | O que é | Como é contado | De onde vem e qual data | Avisos |
|---|---|---|---|---|
| Dia | Data de cada linha. | Um dia por linha, todos os dias do período, mesmo sem movimento. | Dia em Brasília. | Marca ao lado do dia: dia que ainda pode estar incompleto. |
| Social Selling | Quantidade de contatos de Social Selling do dia. | Valor informado no próprio relatório; vazio não conta como zero. | Dia da linha. | |
| Novos contatos | Pessoas que viraram contato no dia. | Cada contato novo conta 1. Contatos importados em lote não contam. | Contatos do Elora App, pelo dia em que o contato foi criado. | |
| Novos ADS | Novos contatos que vieram de anúncio. | Novos contatos com campanha de anúncio registrada. | Pelo dia em que o contato foi criado. | Sem campanha de anúncio registrada no contato, não conta como ADS. |
| Conversas realizadas | Conversas com mensagem recebida no dia. | Cada atendimento conta 1 por dia em que teve mensagem. Notas, transferências e registros automáticos não contam. Conversas de usuários de suporte continuam contando. | Pelo dia da mensagem. | Uma conversa que dura vários dias conta em cada dia. |
| Usuário do sistema | Conversas do dia em que uma pessoa da equipe respondeu. | Parte das Conversas realizadas com mensagem enviada por uma pessoa da equipe. | Pelo dia da mensagem. | Respostas de usuários de suporte não contam como resposta da equipe. |
| Bot | Conversas sem resposta de pessoa da equipe (respondidas só pelo bot ou ainda sem resposta). | Conversas realizadas menos Usuário do sistema. | Pelo dia da mensagem. | |
| Consulta Agendada | Cards que chegaram à etapa "Agendados" com data da consulta preenchida. | Cada card conta 1, uma vez só. | Conta no dia em que o card apareceu pela primeira vez em "Agendados" com a data da consulta preenchida. Não é o dia da consulta. | Antes de 05/11 não há esse histórico ("—"). |
| Consulta Agendada ADS | Consultas agendadas de contatos vindos de anúncio. | Consulta Agendada com campanha de anúncio registrada no contato. | Igual a Consulta Agendada. | Igual a Consulta Agendada. |
| Procedimento Vendido | Cards que chegaram à etapa "Agendados" com data do procedimento preenchida. | Cada card conta 1, uma vez só. | Conta no dia em que o card apareceu pela primeira vez em "Agendados" com a data do procedimento preenchida. Não é o dia do procedimento. | Antes de 05/11 não há esse histórico ("—"). |
| Procedimento Vendido ADS | Procedimentos vendidos de contatos vindos de anúncio. | Procedimento Vendido com campanha de anúncio registrada no contato. | Igual a Procedimento Vendido. | Igual a Procedimento Vendido. |
| Total (rodapé) | Soma do período. | Soma das linhas; fica sempre no rodapé, em qualquer ordem. | | Marcado quando algum dia ainda pode estar incompleto. |

## Resultados (blocos)
| Bloco | O que é | Como é contado | De onde vem e qual data | Avisos |
|---|---|---|---|---|
| Novos leads | Contatos novos no período. | Cada contato novo conta 1. Contatos importados em lote não contam como novos leads. Compara com o período anterior de mesmo tamanho. | Pelo dia em que o contato foi criado. | |
| Conversas realizadas | Igual à coluna do Relatório diário, somada no período. | Mesma regra da coluna. | Pelo dia da mensagem. | |
| TMR | Tempo médio até a primeira resposta. | Média dos atendimentos do período que têm esse tempo; o rodapé mostra quantos entraram. | Pelo dia de início do atendimento. | Atendimentos sem esse tempo ficam fora da média. |
| TMA | Tempo médio de atendimento. | Média dos atendimentos do período que têm esse tempo; o rodapé mostra quantos entraram. | Pelo dia de início do atendimento. | Atendimentos sem esse tempo ficam fora da média. |
| Leads por dia | Novos leads por dia, separados em "Vindos de ADS" e "Sem campanha". | Mesma regra de Novos leads; ADS = tem campanha de anúncio. | Pelo dia em que o contato foi criado. | |
| Leads por (Origem/Canal/Campanha) | Novos leads repartidos pelo item escolhido. | Mesma regra de Novos leads. | Pelo dia em que o contato foi criado. | Quem não tem o dado aparece como "Sem informação". |
| Conversas por dia | Conversas realizadas por dia, separadas em Usuário do sistema e Bot. | Mesma regra das colunas. | Pelo dia da mensagem. | |
| Principais campanhas | Contatos por campanha de anúncio. | Contatos do período com campanha de anúncio, pelo nome da campanha. | Pelo dia em que o contato foi criado. | |
| Atendimentos por canal | Atendimentos por canal de entrada. | Cada atendimento iniciado no período conta 1 no seu canal. | Pelo dia de início do atendimento. | Costuma ser menor que Conversas realizadas: aqui cada atendimento conta uma vez; em Conversas, ele conta em cada dia com mensagem. |
| Conversas por atendente | Atendimentos e conversas de cada atendente. | Atendente da conversa = a última pessoa da equipe que respondeu, sem contar usuários de suporte (se a última foi de suporte, vale a anterior). Sem resposta de pessoa da equipe: "Sem informação". | Atendimentos pelo dia de início; conversas pelo dia da mensagem. | |

**Colunas das tabelas dos blocos**
- **Canal** (Atendimentos por canal): nome do canal de entrada.
- **Atendente** (Conversas por atendente): nome da pessoa da equipe; "Sem informação" quando não houve resposta de pessoa da equipe.
- **Atendimentos**: atendimentos iniciados no período atribuídos a essa linha.
- **Conversas**: conversas do período (uma por atendimento por dia com mensagem) atribuídas a essa linha.
- **Proporção**: parte das conversas do bloco que ficou com essa linha (conversas da linha ÷ total de conversas do bloco).
- **Total** (rodapé): soma da coluna.

## Agendamentos (blocos)
| Bloco | O que é | Como é contado | De onde vem e qual data | Avisos |
|---|---|---|---|---|
| Consultas com data no período | Cards com data da consulta dentro do período, e a soma dos valores. | Cada card conta 1; valor = soma do valor do card. | Pela data da consulta registrada no card. | Card sem valor não entra na soma. |
| Procedimentos com data no período | Cards com data do procedimento dentro do período, e a soma dos valores. | Cada card conta 1; valor = soma do valor do card. | Pela data do procedimento registrada no card. | Card sem valor não entra na soma. |
| Agendamentos e vendas | Lista dos cards contados nos dois blocos acima. | Um card por linha, mesmo se tiver consulta e procedimento no período. | Pela data da consulta ou do procedimento. | O total de linhas pode ser menor que a soma dos dois blocos. |

**Colunas de "Agendamentos e vendas"**: Nome (do contato) · Telefone · Origem (de onde o contato chegou) · Canal (canal do atendimento) · Fase do Cliente (etapa atual do card) · Procedimentos (procedimento registrado no card) · Data da consulta · Valor da consulta (campo "Valor da consulta" do card) · Data do procedimento · Valor do Procedimento (campo "Valor" principal do card) · Campanha de anúncio (origem) · Campanha de anúncio (nome) · Campanha de anúncio (página de entrada). Os títulos dessas três colunas deixam de dizer "UTM".

## Agenda (blocos)
| Bloco | O que é | Como é contado | De onde vem e qual data | Avisos |
|---|---|---|---|---|
| Agendamentos (calendário) | Consultas (amarelo) e procedimentos (verde) no calendário. | Cada card aparece no dia e na hora da sua data. | Pela data da consulta e pela data do procedimento do card. | |
| Itens agendados | Contatos com consulta marcada. | Contatos cujo card tem data da consulta preenchida. | Pela data da consulta. | Mostra só cards com data da consulta preenchida (filtro fixo). |

**Lista do dia no calendário**: Data e hora · Nome · Tipo (consulta ou procedimento) · Telefone · Procedimento de interesse · Valor do card.
**Colunas de "Itens agendados"**: Nome · Procedimento de interesse (do contato) · Data da consulta · Data do procedimento · Valor (do card).

## Blocos novos do construtor (texto automático)
"{Medida} de {fonte}{, agrupado por {campo}}, pela {campo de data} no período." Exemplo: "Contagem de contatos agrupada por Origem, pela data de criação no período."

## Etapas de execução
1. **Regra única de atendente (opção A)** no Relatório diário, no filtro por atendente, em Conversas por atendente e em Resultados: o atendente é a última pessoa da equipe que respondeu, sem contar usuários de suporte (se a última foi de suporte, vale a anterior). Se ninguém da equipe respondeu, fica "Sem informação". O atendente atribuído ao atendimento deixa de ser usado como reserva.
   - **Conversas:** vale a última resposta da equipe naquele atendimento, naquele dia.
   - **Atendimentos:** vale a última resposta da equipe em todo o atendimento.
   - O total de conversas e o de atendimentos não mudam; muda só a divisão por atendente.
2. **Retrato antes e depois** por atendente, nos dois períodos de sempre, com conferência de que os totais são iguais. **Paro aqui para a sua aprovação.**
3. Depois da aprovação: trocar "UTM" por "Campanha de anúncio (origem / nome / página de entrada)" nos títulos das colunas de "Agendamentos e vendas" do Dr. Ricardo.
4. Gravar os textos acima e ligar o ícone "i" nas colunas e blocos, como no plano da Parte B. Os filtros em vigor entram no fim do balão, e as partes vazias não aparecem.
5. Testes da regra de atendente (suporte por último, ninguém da equipe respondeu, totais iguais) e conferência em 390, 834 e 1440 nos dois temas. Não publicar.

## Detalhes técnicos
- Matriz: em `indicadores-motor.ts`, tirar a reserva `responsavel_id/nome` da sessão; o par vem de `elora_conversas_pares` (já ignora suporte).
- Painel visual: em `painel-visual.server.ts`/`painel-visual.ts`, o atendente do par (dia) e do atendimento passa a vir da última mensagem da equipe que não seja de suporte; sem atribuído como reserva. O filtro por atendente usa o mesmo cálculo.
- O cache é invalidado por versão, para não sobrar número antigo.
