# Dra. Nathalia (sfwsf3t7): Relatório diário, Resultados e nova visão Agendamentos

Tudo como configuração dela; nenhum código específico de cliente; Dr. Ricardo e demais clientes intocados.

## 1) Relatório diário — só Contatos novos
- Os 9 indicadores "Contatos novos · ..." (Total, Meta ADS, Google ADS, Instagram, Orgânico, Base Doutora, Sem informação, Patrocinado, Não patrocinado) continuam visíveis, com o cabeçalho em grupos.
- Os indicadores "Agendamentos (consulta agendada) · ..." e "Procedimentos vendidos · ..." ficam fora das colunas: `ativo = false` em `elora_indicadores_config` (é assim que a tela já guarda coluna oculta). Nenhuma linha é apagada; dá para religar depois pelo próprio Editar.
- Efeito colateral a saber: indicador desligado não é calculado. Por isso nenhum bloco das visões abaixo depende deles (usam as conversas classificadas diretamente).

## 2) Aba Resultados (1a09b50d) — cópia fiel dos 10 blocos do Dr. Ricardo (f440aa0f)
Mesma ordem, tipo, título, largura e altura; substitui os 7 blocos atuais.

| # | Bloco | Tipo | Larg×Alt | Dados dela |
|---|---|---|---|---|
| 1 | Novos leads | número | 3×1 | contatos (tem) |
| 2 | Conversas realizadas | número | 3×1 | atendimentos (tem) |
| 3 | TMR | número | 3×1 | atendimentos (tem) |
| 4 | TMA | número | 3×1 | atendimentos (tem) |
| 5 | Leads por dia | barras empilhadas | 8×3 | contatos (tem) |
| 6 | Leads por | rosca | 4×3 | contatos (tem) |
| 7 | Conversas por dia | barras empilhadas | 12×3 | atendimentos (tem) |
| 8 | Principais campanhas | funil | 8×3 | UTM: só 264 de 2.228 contatos têm campanha — fica com poucos dados |
| 9 | Atendimentos por canal | pizza | 4×3 | atendimentos (tem) |
| 10 | Conversas por atendente | tabela | 12×3 | atendimentos (tem) |

Os blocos dele são todos genéricos (sem campo exclusivo dele), então a cópia é literal do JSON, trocando só nada além do id da visão. Após aplicar, confiro quais vieram vazios e informo.

## 3) Nova visão "Agendamentos" (igual à 2a1dc7bf)
Mesmo layout: dois valores 6×1 + dois valores 6×1 + tabela de itens 12×6. No Dr. Ricardo os blocos leem cards (data e valor da consulta/procedimento). Ela não tem cards; o equivalente são as conversas com classificação (hoje no espelho: 6 "Consulta Agendada" e 12 "Procedimento Vendido").

| Bloco | Tipo | Dr. Ricardo usa | Dra. Nathalia usará |
|---|---|---|---|
| Consultas com data no período | dois valores 6×1 | cards do indicador consulta_agendada, data `campo.data-da-consulta`, valor `campo.valor-da-consulta` | fonte atendimento, filtro classificação = Consulta Agendada, data = data da classificação; valor: não existe na conversa → fica em branco, só a quantidade |
| Procedimentos com data no período | dois valores 6×1 | cards de procedimento_vendido, data `campo.data-do-procedimento`, valor do card | fonte atendimento, classificação = Procedimento Vendido, data da classificação; valor em branco |
| Agendamentos e vendas | tabela de itens 12×6 | cards dos dois indicadores, resumo "Consultas / Procedimentos" | fonte atendimento, classificação em [Consulta Agendada, Procedimento Vendido]; colunas: data da classificação, classificação, contato, canal, atendente, Origem |

Primeiro passo técnico desta parte: confirmar que dois valores e tabela de itens aceitam fonte atendimento contando pela data da classificação. Se exigirem ajuste, ele será genérico (nenhuma referência ao cliente) e testado; o resumo por tipo (Consultas/Procedimentos) da tabela é hoje só para cards — se não der para reaproveitar sem estrutura nova, a tabela fica sem esse resumo e eu aviso.

## Execução
1. Mostrar no chat os 3 comandos (UPDATE em indicadores, UPDATE da visão 1a09b50d, INSERT da visão Agendamentos) antes de rodar.
2. Rodar, limpar `elora_calculo_cache` só de sfwsf3t7.
3. Conferir números de 17/11 e 24/11 nos blocos contra o Relatório diário/espelho.
4. Prints em 1440 e 390 (Relatório diário, Resultados, Agendamentos) via link temporário de incorporação, removido ao final.
5. Não publicar.
