# Análise inteligente dos resultados do parceiro

## O que o parceiro vai ver

Na aba **Financeiro → Relatórios** da Área do Parceiro, um bloco novo **"Análise inteligente"**:

- Escolha do período: usa o seletor de ano já existente, mais um campo de mês inicial/final (ou "ano inteiro").
- Campo opcional **"Observações"** — o parceiro escreve o contexto dele (ex.: "perdemos dois clientes por corte de orçamento").
- Botão **"Gerar análise"**. O texto aparece escrito aos poucos, em três partes:
  1. **Resumo do período** — quanto foi pago, ticket médio, evolução mês a mês.
  2. **Variações** — o que subiu, o que caiu, quais clientes puxaram cada movimento.
  3. **Recomendações** — de 3 a 5 ações práticas.
- Botão para copiar o texto.
- Se algo falhar (sem créditos, limite de uso, indisponibilidade), aparece um aviso claro em vez de texto inventado.

## Privacidade (mesma trava de sempre)

A análise é montada **no servidor**, a partir dos mesmos números que o parceiro já pode ver: total pago por mês, ticket médio, aumentos, reduções e — só com permissão de composição — sistema × acompanhamento. Custo, margem, lucro, WTS e desconto de escala **não entram no texto enviado ao modelo**, nem por engano: o servidor monta um resumo com lista branca de campos antes de chamar a IA.

## Detalhes técnicos

- Nova função de servidor `gerarAnaliseFinanceiraParceiro` em `src/lib/parceiro-analise.functions.ts`, com `requireSupabaseAuth`, reaproveitando a resolução de parceiro e os dados de `getFinanceiroParceiro` (`relatorioItens` + `montarRelatorioParceiro`).
- Entrada validada por zod: `{ verComoParceiroId?, ano, mesInicio, mesFim, observacoes?: string (máx. 500) }`.
- Modelo `openai/gpt-6-astra` via Responses API do AI Gateway (`streamText` de `@ai-sdk/openai` + `createOpenAI`, `forceReasoning: true`, `reasoningEffort: "low"`, `store: false`), com o helper de run-id `createLovableAiGatewayRunIdFetch` em `src/lib/ai-gateway.server.ts` (novo).
- Como a resposta é transmitida em partes, o endpoint será uma rota `src/routes/api/parceiro-analise.ts` (POST autenticado) e a tela consome o fluxo; a chave `LOVABLE_API_KEY` fica só no servidor.
- Prompt em português, recebendo um JSON enxuto (lista branca) + observações do parceiro; instrução explícita de não inventar números.
- Erros do gateway são repassados com mensagem própria (402/403 = aviso de créditos/limite; 429/5xx = "tente de novo em instantes").
- Teste em `src/lib/__tests__/analise-parceiro.test.ts` garantindo que o objeto enviado ao modelo não contém custo/margem/lucro/WTS/escala.

## Arquivos

- novo `src/lib/parceiro-analise.functions.ts`, `src/lib/ai-gateway.server.ts`, `src/routes/api/parceiro-analise.ts`
- edição `src/routes/parceiro.tsx` (bloco na aba Relatórios)
- novo teste `src/lib/__tests__/analise-parceiro.test.ts`

## Quanto custa

O uso de IA é debitado dos créditos do workspace, por análise gerada (não há mensalidade extra).

Com o modelo padrão e um texto de análise de tamanho normal:

- entrada (números do período + instruções): ~3.000 tokens → ~US$ 0,03
- saída (o texto da análise): ~1.200 tokens → ~US$ 0,06

**≈ US$ 0,09 por análise gerada** (cerca de R$ 0,45). Ou seja:

- 10 análises/mês ≈ US$ 0,90
- 100 análises/mês ≈ US$ 9,00

Dá para reduzir bastante limitando o tamanho do texto no prompt e guardando a última análise de cada período (para não regerar a mesma coisa) — posso incluir esse cache se você quiser.

## Validação

- Gerar análise com a Rabbit Agency (com permissão de composição) e com a Distribox (sem) — conferir que a segunda não cita sistema × acompanhamento.
- Conferir que o texto aparece progressivamente e que o aviso de erro aparece quando a chamada falha.
- Celular, tablet e computador, temas claro e escuro.
