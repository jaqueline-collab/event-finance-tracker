# Etapa C, parte 2 (refeita): relatório diário com indicadores configuráveis

Nenhuma regra do Dr. Ricardo no código: tudo vira configuração gravada no banco.

## Ponto de atenção antes de começar
A tabela `elora_cards_historico` ainda não existe (o diagnóstico mostrou que a API não guarda histórico de etapas). Esta etapa cria o espelho de cards e o histórico, gravado a cada sincronização a partir de agora. Tudo antes da primeira leitura sai marcado "estimado" (dia = data de atualização do card, a melhor pista disponível).

## O que será feito
1. **Cards e histórico**: `elora_cards_espelho` (estado atual + registro completo) e `elora_cards_historico` (card, etapa, fase, status, campos preenchidos, visto_em, estimado). Sem acesso direto pela API, só servidor. "Sincronizar agora" passa a ler cards e grava uma linha nova só quando algo mudou.
2. **Configuração**: `elora_indicadores_config` com os campos do documento (chave, nome, fonte, medida, evento, condições E/OU, ordem, tipo, ativo). Sem acesso direto; escrita só super admin.
3. **Colunas padrão** (sistema, para todo cliente): novos contatos sem IMPORTED, novos ADS, conversas realizadas, usuário do sistema, bot. Regra já validada contra o monday. Cliente sem configuração mostra só essas.
4. **Seed do 8c0ojhr2** (dado, editável depois): Consulta Agendada, Procedimento Vendido e as duas versões ADS (condição utm.campaign preenchido), como no documento. Social Selling continua manual.
5. **Motor único**: lê a configuração, acha o primeiro dia (São Paulo) em que evento + condições valem, conta uma vez por card e não descontar depois. Grava em `elora_relatorio_diario` de 22/09 em diante, com linha de total.
6. **Tela de validação** só super admin: últimos 30 dias, marca de "estimado". Edição das colunas fica para a visão Matriz.
7. **Testes**: dois clientes não se misturam; "entrou na etapa" e "campo preenchido" no dia certo; ADS por utm.campaign; estimado marcado; cliente sem configuração.

Ao final: conferir que os 12 dias de 22/09 a 03/10 continuam batendo com o monday nas colunas padrão, mostrar e parar. Nada apagado, nada publicado.

## Adendo incorporado
- **Leitura dos cards**: todos os painéis da conta, incluindo "Minhas tarefas"; uma leitura por status (abertos, `Statuses=WON`, `Statuses=LOST`, `Statuses=ARCHIVED`), PageSize 100, pausa de 250 ms, nova tentativa em 429. Assim entram os 39 ganhos e 98 perdidos.
- **Sincronização automática a cada 30 min** (48 vezes por dia): só cards com `UpdatedAt.After` = última leitura menos 1 hora de folga. Quanto mais frequente, mais certo o dia de "entrou na etapa"; o custo é cerca de 48 rodadas leves por dia mesmo sem mudanças. Ela chama um endereço do app protegido pelo segredo `SYNC_CRON_SECRET` (vou pedir esse segredo se ainda não existir). Como o banco é seu (externo), o agendamento é criado no seu Supabase e eu mostro o comando para conferência antes.
- **Antes de gravar no relatório diário**: mostro lado a lado, por dia, o que já existe (n8n) e o que o motor calculou nas colunas padrão. A gravação só acontece se os 12 dias de 22/09 a 03/10 baterem. Dias "estimado" aparecem com marca e nenhum total os soma sem a marca.

## Detalhes técnicos
- Lógica pura em `src/lib/indicadores-motor.ts` (testável); leitura/gravação em `indicadores.server.ts`; funções com `exigirSuperAdmin`.
- Condições: `{op:'E'|'OU', itens:[{campo, operador: preenchido|igual|contem|vazio, valor}]}` sobre o catálogo (contato, card, campos personalizados, utm).
- Linhas gravadas em `elora_relatorio_diario` sem apagar as existentes do n8n (upsert por cliente+dia+recortes).
