# Relatório diário da Dra. Nathalia: ADS sem repetição e aviso "pode estar incompleto"

## 1. Botão ADS — o que faz hoje (duas linhas)
Ele só mostra/esconde as colunas cujo código termina em "ads" (Meta ADS, Google ADS e "Novos ADS"), pelo nome e não pela configuração de Origem.
Por isso Instagram (patrocinado na configuração) não é afetado, Google ADS é escondido mas conta como Não patrocinado, e "Novos ADS" repete "Contatos novos · Patrocinado".

## Proposta sem repetição (usando o mesmo botão, nada novo)
- O botão ADS passa a ler a configuração de Origem do cliente: ligado mostra, em cada grupo (Contatos novos, Agendamentos, Procedimentos vendidos), as colunas das Origens marcadas como patrocinadas; desligado esconde só essas, deixando Total, Origens não patrocinadas, Sem informação, Patrocinado e Não patrocinado.
- Patrocinado e Não patrocinado continuam como o único resumo, vindos da mesma configuração.
- A coluna "Novos ADS" sai do relatório dela (é igual a "Contatos novos · Patrocinado"); a linha de configuração é removida, sem apagar dados.
- Configuração de Origem: **Google ADS passa a patrocinado** (confirmado). Instagram fica como está até você confirmar.
- Clientes sem configuração de Origem continuam com o comportamento atual do botão (nada muda para eles).

## 2. Aviso "pode estar incompleto" — causa encontrada
- A regra só considera um dia confirmado quando cada fonte (contatos, atendimentos, mensagens e, se houver, cards) tem um intervalo de cobertura gravado que inclui o dia.
- Esse intervalo nunca é gravado: a tabela de estado da sincronização não tem esse campo e a leitura nem o pede. Resultado: todo dia de todo cliente sai "parcial", mesmo com as cinco fontes da Dra. Nathalia concluídas hoje (22:12–22:15 UTC) e a conferência batendo.

## Correção proposta
- Gravar o intervalo coberto por fonte: ao concluir a carga completa, de "início da conta" até o dia da conclusão; cada sincronização incremental concluída estende o fim.
- O aviso aparece só por motivo real: fonte sem carga concluída, fonte atrasada (última conclusão com mais de 6 horas ou última execução com erro), dia fora do intervalo coberto, ou dia que a última conferência apontou com diferença.
- O dia de hoje sempre continua com "pode estar incompleto"; dias anteriores ao início do histórico do cliente ficam como hoje.
- Gravar a cobertura só registra: não muda nada no comportamento da sincronização.
- O texto do "i" do Dia continua igual.
- Validação: retrato antes/depois do Relatório diário da Dra. Nathalia, do Dr. Ricardo e de mais um cliente: números iguais, com a lista dos dias que mudam só no aviso.

## 3. Dr. Ricardo — verificação de cards excluídos por painel
- A etapa de exclusões grava o avanço por painel (painel atual, página e IDs vistos daquele painel) após cada pedido e retoma na rodada seguinte, um painel por vez, sem listar os 12 de uma vez.
- Travas mantidas: só marca com ENTITY_NOT_FOUND no pedido por id, nunca em rodada incompleta, limite de 10 cards ou 2% da janela de 30 dias.
- A conferência só fica "concluída" quando todos os painéis terminarem.
- Prova: conferência automática concluindo sozinha, com id, número de rodadas e o campo exclusoes.

## Detalhes técnicos
- `colunas-tabela.ts`: `ehColunaAds` aceita a lista de chaves patrocinadas derivada de `elora_indicadores_config` + mapa Origem→patrocinado; fallback ao regex atual quando não houver mapa.
- Migração: `elora_sync_estado.cobertura jsonb default '[]'` (só servidor, sem grant novo); escrita no fim de carga/incremental no motor de espelho.
- `sync-cobertura.ts`: considera também atraso/erro e dias com diferença em `elora_conferencias`; `matriz.server.ts` passa a selecionar `cobertura`, situação e as diferenças.
- Testes: botão ADS por configuração (Instagram/Google ADS/Meta ADS), sem "Novos ADS"; cobertura confirmada, atrasada, com erro e com diferença. Teste da retomada por painel e das travas. Substituir a regra do AGENTS.md sobre cobertura pela nova.
- Nada publicado.
