# Área do Parceiro — Clientes + Financeiro (com liberação manual)

## O que muda para você

Na tela de cadastro de parceiros você ganha um novo controle por parceiro: **"Pode ver fechamentos"** (desligado por padrão). Separado do controle de valores que já existe.

Na tela interna de Fechamento Mensal, cada fechamento já gerado ganha um botão **"Enviar para parceiro"**. Enquanto você não clicar, aquele fechamento não existe para nenhum parceiro. Depois de enviado, aparece a data do envio e a opção de desfazer o envio.

Na área do parceiro passa a existir:

- Menu lateral próprio com **Clientes** e **Financeiro** (Financeiro só aparece com o controle ligado).
- Barra superior com **Site** (o site do próprio parceiro — ex.: rabbitagency.com.br), **Elora App** (login real do app, `https://app.eloracrm.com.br/`) e **Treinamento** (aviso "página em construção"). O endereço do site passa a ser um campo editável por você no cadastro do parceiro; quando estiver vazio, o botão Site simplesmente não aparece.
- Em Clientes: busca por nome, filtro de período personalizável, filtro ativos/inativos e blocos-resumo do período escolhido — clientes ativos, entradas, saídas, LTV média e LTV mediana — mais um gráfico de barras de entradas x saídas por mês.
- Em Financeiro: a lista dos fechamentos que você enviou, e dentro de cada um apenas as linhas dos clientes daquele parceiro, com composição cobrada, valor bruto, desconto e valor líquido.

Nunca aparecem para o parceiro: custo WTS, desconto de escala, margem, lucro, nem qualquer cliente de outro parceiro.

Nada de fechamento, cliente ou lançamento existente é alterado — só é acrescentada a camada de liberação e exibição.

## Banco de dados (aditivo)

Uma migração, só colunas novas:

- `elora_parceiros.pode_ver_fechamentos boolean not null default false`
- `elora_fechamentos.enviado_parceiro_em timestamptz null`
- `elora_fechamentos.enviado_parceiro_por uuid null`

Nenhum dado existente é tocado (sem UPDATE, sem DELETE).

## Função de servidor do Financeiro do parceiro

Nova função `getFinanceiroParceiro` em `src/lib/parceiro.functions.ts`, no mesmo padrão já validado (`requireSupabaseAuth`, aceita `verComoParceiroId` só para equipe interna, somente leitura):

1. Resolve o `parceiroId` (login do parceiro, ou id escolhido pelo admin no modo "ver como").
2. Lê `pode_ver_fechamentos` direto do banco, sem cache. Falso → retorna `{ habilitado: false, fechamentos: [] }` e o menu Financeiro nem é renderizado.
3. Carrega os ids dos clientes com `parceiro_id = parceiroId`.
4. Consulta `elora_fechamento_itens` **apenas** desses `cliente_id`, juntando com `elora_fechamentos` onde `enviado_parceiro_em is not null` e `deletado_em is null`.
5. Projeta explicitamente por linha: `clienteNome`, `cicloInicio`, `cicloFim`, `vencimento`, `valorBruto`, `valorDesconto`, `valorLiquido` e a composição já existente em `payload_snapshot`, filtrada por lista branca de chaves (só itens de cobrança do cliente). Nenhum campo de custo, margem, lucro, WTS ou desconto de escala entra no retorno — a seleção é por lista branca, não por remoção.
6. Totais por fechamento são somados **só** sobre as linhas do próprio parceiro.

Marcar/desmarcar o envio é outra função de servidor, `alternarEnvioFechamentoParceiro`, restrita a `is_admin()`, que só grava `enviado_parceiro_em`/`enviado_parceiro_por`.

## Telas

- `src/routes/gestao-parceiros.tsx`: terceiro switch "Pode ver fechamentos", mesmo padrão dos dois atuais (`updateParceiro`), com `pode_ver_fechamentos` mapeado em `src/lib/types.ts` e `src/lib/mappers.ts`.
- `src/routes/resumo.tsx`: botão "Enviar para parceiro" em cada fechamento da lista, com badge de data de envio e ação de desfazer. Nenhuma alteração de cálculo nem de gravação de fechamento.
- `src/routes/parceiro.tsx`: passa a ter layout próprio com menu lateral (`Clientes` / `Financeiro`, via search param `aba`) e barra superior (Site → `/`, Elora App → `/`, Treinamento → aviso em construção). A aba Clientes recebe busca, filtros de período e status, blocos-resumo (ativos, entradas, saídas, LTV média e mediana no período) e o gráfico de barras entradas x saídas por mês (recharts, já usado no painel). A aba Financeiro consome `getFinanceiroParceiro`.
- O banner de "visualizando como" do modo admin continua igual, agora também na aba Financeiro.

LTV é calculado a partir do que o parceiro já pode ver: meses ativos x mensalidade cobrada. Se o controle de valores estiver desligado, os blocos de LTV não são calculados nem enviados.

## Validação

Testes automatizados novos em `src/lib/__tests__/`, no mesmo formato do teste de RLS já existente (massa descartável criada e apagada pelo teste), cobrindo:

1. Fechamento não enviado → não aparece para o parceiro, mesmo com o controle ligado.
2. Fechamento enviado + controle desligado → função retorna `habilitado: false` e lista vazia.
3. Fechamento enviado + controle ligado → só as linhas dos clientes do próprio parceiro; cliente de outro parceiro no mesmo fechamento não aparece.
4. Nos três cenários, o retorno serializado não contém nenhuma chave de custo, margem, lucro, WTS ou desconto de escala.

Depois rodo os testes e mostro o resultado real de cada cenário, além de conferir a área pelo modo "ver como este parceiro".
