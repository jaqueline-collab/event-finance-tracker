# Conferência com o Elora App (por cliente, só super admin)

## Teste já feito na API do Elora (só leitura, Dr. Ricardo, dia 16/11)
- Atendimentos e Contatos aceitam filtro por data de criação e devolvem o total sem baixar a lista (29 atendimentos, 19 contatos no dia).
- Cards também aceitam, mas por painel: a soma dos 5 painéis deu 22 no Elora contra 23 no nosso banco. A causa ainda não foi confirmada e vai ser investigada na conferência real (provavelmente card arquivado ou excluído).
- Mensagens só são listadas por conversa, por isso continuam conferidas por amostra.

## O que vai existir
- Uma nova aba "Conferência com o Elora App" na configuração do cliente, visível só para super admin.
- Tabela dos últimos 7 dias, uma linha por dia, mais a linha de total:
  - Atendimentos criados, Contatos novos e Cards criados, cada um com três números: nosso banco, Elora e diferença. Verde quando é zero, vermelho quando não é, e "em andamento" para diferença de até 1 no dia de hoje durante a conferência.
  - Mensagens: quantas conversas foram sorteadas e quantas bateram.
- Aviso na tela: "Fuso usado: Brasília (America/Sao_Paulo)". Os dias são cortados à meia-noite de Brasília nos dois lados.
- Data e hora da última conferência, com o resultado. Histórico guardado.
- Botão "Conferir agora". Enquanto roda, mostra "Conferindo..." com o progresso real (dia e coluna).
- Selo no card da conexão com o Elora quando alguma célula ficar vermelha, com o dia e a coluna.
- Execução automática uma vez por dia, na primeira rodada depois das 02:55, dentro da sincronização que já existe.

## Como funciona
- Estende a checagem semanal de mensagens que já existe (mesma tabela de histórico, só do servidor). Ela passa a ser diária e ganha as três contagens novas. Não haverá um segundo mecanismo.
- Contagem no Elora usa o filtro de data com uma página de 1 item (só o total), sem gravar nada no espelho.
- Divide o trabalho em rodadas se o tempo acabar; o progresso fica gravado e o botão continua de onde parou.
- Nada específico de cliente; nenhum cálculo de painel muda.

## Entrega
- Rodo a conferência real do Dr. Ricardo e trago a tabela com os números, dizendo quais dias ficaram vermelhos e por quê.
- Testes das regras (verde/vermelho/em andamento, corte de dia em Brasília, total, quando a execução diária fica vencida). Rodo todos os testes. Não publico.

## Detalhes técnicos
- Migração: em `elora_checagem_mensagens`, adicionar colunas por tipo (`atend_nosso/elora`, `contatos_nosso/elora`, `cards_nosso/elora`, `msg_bateram`) e `conferencia_id`; nova tabela `elora_conferencias` (id, cliente_id, iniciado_em, concluido_em, progresso, cursor, situacao), só service role.
- `mensagens-checagem.server.ts` vira o módulo da conferência: `conferirCliente(db, cliente, ctx, prazo)` retomável. Regras puras em `src/lib/conferencia.ts`.
- Elora: `/chat/v2/session` e `/core/v1/contact` com `CreatedAt.After/Before`; `/crm/v2/panel/card?PanelId=` por painel conhecido.
- Disparo diário em `src/routes/api/public/sync-cards.ts`: vencida = sem conferência concluída desde as 02:55 de hoje (Brasília).
- Servidor exige `is_admin` nas funções de leitura e de execução; tela em um novo componente ligado ao painel lateral de configuração; selo em `integracao-elora.tsx`.
