## Objetivo

Unificar o cálculo de custo em uma única função `custoMensalCliente(cliente, plano, custos)`, usada em Dashboard, fechamento, resumo e ranking. `helena.ts` deixa de ter regra própria de franquia (hoje fixa 1 canal / 3 usuários / 500 contatos) e passa a ser apenas um agregador que soma o custo por cliente.

## Decisões que preciso confirmar antes de codar

1. **Desconto de escala WTS (10/15/20/25% em faixas de R$10k / 25k / 50k / 100k)** — hoje só existe no agregado. Duas opções:
   - **(a)** Continua como desconto agregado da operação (aplicado só no total do Dashboard / "custo operacional"), e **não** entra no `custoMensalCliente` de um cliente individual. É o mais fiel ao contrato WTS.
   - **(b)** Rateado proporcionalmente por cliente (custo_cliente × %desconto_da_faixa_agregada), para que o "lucro por cliente" nos rankings/clientes já reflita o desconto.
   
   Qual você quer?

2. **Fonte dos custos unitários** — hoje `elora_custos_wts` ainda não existe (só levantamento). Confirmar: crio a tabela agora nesta mesma tarefa (schema com faixas de volume — `item_key`, `faixa_min`, `faixa_max`, `preco_unit`, `moeda`) e uso ela como fonte única, certo?

3. **3 clientes para validação antes/depois** — sugestão: **Majestic**, **Fischer** e **Zayn** (têm complexidade: excedentes de canais, Z-API e usuários). Confirma ou prefere outros?

## Escopo da mudança

### `src/lib/calc/helena.ts`
- Remover `calcularCustoBrutoHelena` (versão com franquia fixa 1/3/500).
- Manter apenas as funções de faixa de volume: `calcularCustoExtraUsuariosHelena`, `calcularCustoExtraContatosHelena`, `calcularCustoExtraCanaisHelena` — se decidirmos manter tabela WTS como fonte de custo unitário, essas funções passam a receber os preços vindos de `elora_custos_wts` ao invés de hardcoded.
- `calcularDescontoEscalaHelena` — mantida (faixas hardcoded ok por ora, a menos que você queira mover para tabela também).
- `calcularCustoLiquidoHelena(clientesAtivos, planos, custos)` reescrita: `sum(custoMensalCliente(c, planos, custos)) − calcularDescontoEscalaHelena(sum)`.

### `src/lib/calc/custo.ts`
- Vira a fonte única de custo por cliente.
- Continua respeitando franquia real do plano (`canaisWhatsInclusos`, `usuariosInclusos`, `contatosInclusos`, `incluiIA`, `incluiAsaas`, `incluiZapi`, `incluiTranscricao`).
- Custos unitários passam a ser lidos de `elora_custos_wts` (via parâmetro `custos: CustoBase[]`) — fim dos defaults hardcoded `?? 149.90`, `?? 29.90`, etc. Se um item não estiver na tabela, erro visível (não silencioso).
- Aplica faixas de volume via as funções `calcularCustoExtra*Helena` (agora parametrizadas por preço da tabela).

### `src/routes/dashboard.tsx`, `src/routes/clientes.tsx`, `src/routes/resumo.tsx`
- Continuam chamando `custoMensalCliente` e `calcularCustoLiquidoHelena`; assinaturas mudam pouco (helena passa a receber `planos` e `custos`), então ajuste dos call sites.

### `elora_planos`
- **Nenhuma mudança de dados.** Só leitura das colunas de franquia que já existem.

### `elora_custos_wts` (opcional item 2 acima)
- Se aprovado, migração cria tabela com colunas: `item_key text`, `faixa_min int`, `faixa_max int null`, `preco_unit numeric`, `ativo bool`, timestamps. Populo com os valores WTS já levantados (licença 149,90; canal 29,90 nas 4 primeiras / 19,90 acima; usuário 19,90 até 17 / 14,90 18-97 / 12,90 98+; contato faixa 5k-20k / 20k-100k / 100k+; IA 50; Asaas 49,50; Z-API 69; transcrição 3,99/usuário).
- GRANT + RLS (SELECT autenticado, admin escreve).

## Ordem de execução

1. Você responde as 3 perguntas acima.
2. Migração `elora_custos_wts` (se item 2 = sim) — só schema + seed, sem tocar em nenhuma outra tabela.
3. Refactor de `helena.ts` e `custo.ts`.
4. Ajuste dos call sites.
5. Executo o cálculo para os 3 clientes escolhidos e te apresento a tabela **antes × depois** (receita, custo, lucro) para você validar antes de considerar concluído.

## Fora de escopo (não vou tocar)

`elora_clientes`, `elora_movimentos`, `elora_financeiro`, `elora_parceiros`, `elora_descontos`, lógica de receita (`receita.ts`), fechamentos já gerados.
