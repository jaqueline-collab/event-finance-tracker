# Elora, assistente de IA nas Áreas do cliente e do parceiro

## O que já existe (reaproveitado)
- Layout comum `AreaExternaLayout` (cliente e parceiro): o botão entra uma vez só ali, então aparece nas duas áreas e em "Visualizando como cliente".
- `ELORA_GUIA_URL` (endereço global do guia).
- Leituras já calculadas: Matriz (`matriz.server.ts`), relatório diário gravado, indicadores/painel visual (`painel-visual.ts`), regra "Não definido".
- Verificação de acesso do parceiro e do "Ver como" já usada nas funções do parceiro/cliente.
- Não existe hoje nenhum chat, botão flutuante ou chamada de IA no app: nada a duplicar.

## Interface
- Botão flutuante "Elora" no canto inferior direito; abre painel lateral (no celular ocupa a tela).
- Respostas em streaming, histórico só na sessão, botão "Nova conversa", aviso: "A Elora é uma IA e pode errar. As conversas ficam salvas e só a equipe Elora pode vê-las, para melhorar o produto."
- Mensagens com formatação (negrito, listas, tabelas). Claro/escuro, 390/834/1440. Nada desativado nem "Em breve".

## Modelo e onde roda
- Lovable AI (chave já gerenciada pela plataforma, sem chave nova), modelo padrão `openai/gpt-6-astra`, raciocínio "low" para custo/velocidade.
- Roda só no servidor do app (rota de streaming autenticada). O navegador nunca vê chave nem prompt.
- A Elora só lê e explica; nenhuma ferramenta altera dados.

## Dúvidas sobre a ferramenta
- Servidor baixa o guia (`ELORA_GUIA_URL` e páginas internas do /docs), converte para texto e guarda em cache (tabela própria, renovado a cada 24 h).
- Instrução fixa: responder só com base no guia; se não estiver lá, dizer "não sei" e mandar o link do guia.

## Ferramentas de leitura (servidor)
Todas recebem o cliente do contexto validado da sessão, nunca do texto digitado:
1. `listar_clientes_acessiveis` — parceiro: seus clientes vinculados; cliente: só ele.
2. `indicadores_periodo(cliente, de, ate)` — 5 colunas padrão + indicadores configurados (marcando dias estimados).
3. `comparar_periodos(cliente, periodoA, periodoB)`.
4. `totais_por_dimensao(cliente, de, ate, canal|atendente|equipe)` — ausente = "Não definido".
5. `ler_matriz(cliente, de, ate)` — colunas visíveis ao cliente.
- O parceiro só escolhe entre clientes da lista 1; o servidor confere o vínculo em cada chamada. Parceiro sem permissão de valores não vê valores financeiros (e nunca custo/margem/lucro/WTS/desconto).
- Sem SQL livre, sem texto de mensagens. Cliente sem cards/classificação: ferramenta devolve só o que existe.
- Toda resposta numérica cita período e fonte ("Matriz, 01/11 a 08/11"); estimados ditos como estimados.

## Tabelas novas
- `elora_ia_conversas` (usuário, cliente, área, pergunta, resposta, ferramentas usadas, tokens, data) — RLS ligado sem policy; escrita e leitura só pelo servidor; leitura do histórico só super admin.
- `elora_ia_config` (global, uma linha): limite diário por usuário (inicial 30 mensagens), máx. pergunta (1.000 caracteres), máx. resposta (~1.500 tokens), ligado/desligado. Editável pela super admin em Configurar API.
- `elora_ia_guia_cache` (texto do guia + data).

## Limites e custo estimado
- Cada pergunta: ~1 a 3 chamadas ao modelo (com ferramentas), cerca de 6–12 mil tokens de entrada (guia + dados) e até 1.500 de saída.
- Estimativa: poucos centavos de crédito por pergunta; com 30 por usuário/dia o teto por usuário é baixo. Uso descontado dos créditos de IA do workspace. Antes de executar confiro o preço real na lista de modelos e informo.
- Limite atingido: "Você chegou ao limite de perguntas de hoje. Volta amanhã."

## Testes
- Cliente A não lê B (ferramenta e pedido direto no texto).
- Parceiro P1 não lê cliente de P2.
- Pergunta fora do guia → "não sei" + link.
- Pergunta sobre texto de mensagem → recusada.
- Limite diário bloqueia com mensagem clara.
- Cliente sem cards/classificação → sem erro.
- Depois: conferir telas nos dois temas e três larguras, listar alterações e parar. Sem publicar.

## Detalhes técnicos
- AI SDK (`ai`, `@ai-sdk/openai` Responses) + AI Elements no painel; rota `src/routes/api/elora-ia.ts` com bearer do Supabase verificado no handler.
- Contexto de acesso resolvido no servidor (`elora-ia-acesso.server.ts`): cliente logado, parceiro + vínculo, ou super admin com `como={id}`.
- Ferramentas em `elora-ia-ferramentas.server.ts`, reaproveitando `matriz.server.ts` e leituras do relatório; funções puras testáveis.
- Regra registrada em `AGENTS.md`.
