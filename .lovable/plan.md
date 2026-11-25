# Aba Resultados da Dra. Nathalia no padrão do Dr. Ricardo

## Situação atual (importante)
O UPDATE dos 16 blocos **já foi gravado** na rodada anterior: a visão `1a09b50d` hoje tem 15 cartões de número soltos + 1 barra. Este plano **substitui** esse conteúdo. Nada de outros clientes é tocado.

## Layout (cópia da grade da visão f440aa0f do Dr. Ricardo)

```text
Linha 1  | Contatos novos (3) | Agendamentos (3) | Procedimentos vendidos (3) |   <- números com comparação
Linha 2  | Contatos novos por dia (8, barras por Origem)  | Contatos novos por origem (4, rosca) |
Linha 3  | Patrocinado e não patrocinado (4, rosca) | Agendamentos e procedimentos vendidos por dia (8, barras) |
```
Ricardo usa 4 números de largura 3; aqui são 3 números, então largura 4 cada para fechar as 12 colunas. Alturas iguais às dele (número 1, gráficos 3). Sem funil, campanhas, canais ou tabela de atendentes.

## Blocos
| Id | Tipo | Título | Conteúdo |
|---|---|---|---|
| kpi-contatos | número | Contatos novos | indicador Contatos novos · Total, com comparação |
| kpi-agend | número | Agendamentos | indicador Agendamentos · Total |
| kpi-proc | número | Procedimentos vendidos | indicador Procedimentos vendidos · Total |
| contatos-dia | barras empilhadas | Contatos novos por dia | séries = indicadores de cada Origem (Meta ADS, Google ADS, Instagram, Orgânico, Base Doutora, Sem informação), rótulos curtos |
| contatos-origem | rosca | Contatos novos por origem | mesmos 6 indicadores de Origem |
| patrocinado | rosca | Patrocinado e não patrocinado | indicadores Patrocinado / Não patrocinado |
| agend-proc-dia | barras empilhadas | Agendamentos e procedimentos vendidos por dia | séries Agendamentos e Procedimentos vendidos (Totais) |

Todos usam os indicadores da Matriz dela, então os números são os mesmos do Relatório diário (inclusive "Sem informação" e a regra de Patrocinado da configuração).

## Técnico
- Rosca com vários indicadores hoje sai fatiada por dia. Ajuste geral pequeno em `cartaoDeIndicadores` (`src/lib/graficos.ts`): para pizza/rosca, cada indicador vira uma fatia com o total do período. Teste novo com valores concretos. Sem estrutura nova.
- Rótulo de série = texto depois de " · " do nome do indicador (mesma regra do cabeçalho em grupos).
- UPDATE só em `elora_dashboard_visoes` id `1a09b50d…` e `cliente_id = 'sfwsf3t7'`, mostrado antes de rodar; depois limpa `elora_calculo_cache` só dela.

## Prova
- Totais de 17/11 e 24/11 iguais ao Relatório diário.
- Prints da aba em 1440 e 390 em `/mnt/documents/resultados/`.
- Todos os testes. Nada publicado.
