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
Para cada um dos dois grupos: Total, uma coluna por Origem do contato, Sem informação, Patrocinado e Não patrocinado. A configuração de Patrocinado fica exatamente como está (Meta ADS e Instagram) até você confirmar Google ADS e Instagram.

## Passo 4 — 23/11 e 24/11 conversa por conversa
- Lista de cada agendamento e procedimento vendido: data de conclusão, classificação e Origem do contato.
- Explicação da diferença em 24/11 (fechamento dela: 0 agendamentos; nosso: 1, Origem Orgânica), por exemplo conversa concluída num dia e classificada em outro, ou contato antigo.

## Passo 5 — Conferência
- Os totais por dia do Relatório devem ser iguais aos do levantamento.
- Rodar todos os testes; teste novo garantindo que "Consulta sem resposta" e "Procedimento que não realizamos" não entram.
- Nada publicado.

## Passo 6 — Dr. Ricardo: causa da conferência aberta (só leitura)
- Ler os registros de `elora_conferencias` e os logs das rodadas automáticas para mostrar em que etapa parou e por quê. Nenhuma mudança antes de você ver a causa.

## Detalhes técnicos
- Fonte: `elora_atendimentos_espelho.classificacao`, data por `encerrado_em` convertida para America/Sao_Paulo.
- Indicadores via `elora_indicadores_config` com `{fonte, campo}` explícitos; colunas da Matriz geradas a partir deles.
