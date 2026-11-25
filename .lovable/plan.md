# Dra. Nathalia (sfwsf3t7): Agendamentos e Procedimentos vendidos no Relatório diário

## O que já existe no banco (lido agora)
Classificações de conversa da conta `sfwsf3t7` (todas as conversas sincronizadas):
- **Consulta Agendada** — 6
- **Procedimento Vendido** — 12
- Parecidas no nome, mas de perda: **Consulta sem resposta** (18) e **Procedimento que não realizamos** (6).

## Passo 1 — Levantamento (só leitura, antes de criar colunas)
- Confirmar no Elora quais classificações são de **ganho**. Se só "Consulta Agendada" e "Procedimento Vendido" forem ganho, sigo. Se aparecer outra classificação de ganho parecida, paro e mostro antes de criar as colunas.
- Tabela dos últimos 30 dias: nome exato de cada classificação e número de conversas por dia, contando pelo **dia em que a conversa foi concluída** (corte à meia-noite de Brasília).

## Passo 2 — Configuração por cliente (sem nada dela no código)
- Dois indicadores na configuração dela:
  - **Agendamentos (consulta agendada)** = conversas concluídas com "Consulta Agendada".
  - **Procedimentos vendidos** = conversas concluídas com "Procedimento Vendido".
- Data de contagem: dia da conclusão da conversa.
- O antigo "Agendamentos" que usava a data da classificação passa a usar esta regra (amplia o que existe, sem criar um segundo).

## Passo 3 — Relatório diário
Para cada um dos dois grupos: Total, uma coluna por Origem do contato, Sem informação, Patrocinado e Não patrocinado (Meta ADS e Instagram continuam patrocinados).

## Passo 4 — Conferência
- Os totais por dia do Relatório devem ser iguais aos do levantamento.
- Rodar todos os testes; teste novo garantindo que "Consulta sem resposta" e "Procedimento que não realizamos" não entram.
- Nada publicado.

## Detalhes técnicos
- Fonte: `elora_atendimentos_espelho.classificacao`, data por `encerrado_em` convertida para America/Sao_Paulo.
- Indicadores via `elora_indicadores_config` com `{fonte, campo}` explícitos; colunas da Matriz geradas a partir deles.
