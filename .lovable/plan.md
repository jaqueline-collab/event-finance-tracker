# Painel do Parceiro: NF por fechamento, filtros de período e Relatórios

## 1. NF passa a ser do fechamento, não de cada cliente

- Some a coluna **NF** (e o botão de baixar) das linhas de cliente dentro da competência expandida.
- O botão de baixar a nota passa a ficar **na linha da competência**, ao lado do valor total — um download só por fechamento.
- A nota continua sendo baixada pelo servidor, que confere que ela pertence ao parceiro logado.

## 2. Resumo da competência sem precisar expandir

A linha fechada (ex.: "Rabbit Agency · Agosto/2026") passa a mostrar:

- **Ciclo** (ex.: 01/08/2026 → 31/08/2026)
- **Vencimento**
- **NF** — botão de baixar quando há nota; sem nota, nada aparece
- O valor total e o selo da competência continuam como hoje

Em telas pequenas esses dados quebram em duas linhas dentro do cabeçalho, sem cortar.

## 3. Acompanhamento no pop-up "O que inclui a licença base"

Nova linha **"Acompanhamento: R$ [valor do plano]"**, visível apenas para parceiro com permissão de composição. Sem a permissão, a linha não existe — mesma trava já usada no resto da Área do Parceiro.

## 4. Filtro de período vira lista de opções (só na aba Clientes)

O "De / Até" da aba Clientes vira um seletor único:

- **Este mês** (padrão)
- **Mês passado**
- **Trimestre** — últimos 3 meses corridos a partir de hoje
- **Personalizado** — só aqui aparecem os campos De e Até

A aba Financeiro e o gráfico anual seguem como estão hoje (gráfico mantém o seletor de ano próprio).

## 5. Blocos de indicador clicáveis

"Entradas no período", "Saídas no período" e "Total de excedentes" viram filtros da tabela de clientes:

- **Entradas** → só clientes com início/ativação dentro do período
- **Saídas** → só clientes com churn dentro do período
- **Total de excedentes** → só clientes com algum excedente acima de zero no período

O card ativo fica destacado (borda e fundo próprios) e clicar de novo remove o filtro. Só um filtro ativo por vez.

## 6. Novo painel "Relatórios" dentro de Financeiro

Alternador no topo da aba Financeiro: **Fechamentos** (o que já existe) e **Relatórios** (novo), com seletor de ano próprio, igual ao do gráfico de entradas/saídas.

- **Gráfico de barras — Total pago por mês**: soma dos lançamentos com status Pago, mês a mês, nos 12 meses do ano escolhido.
- **Gráfico de pizza — Sistema × Acompanhamento**: só aparece para parceiro com permissão de composição. Sem permissão, nem o gráfico nem o espaço dele existem.
- **Ticket médio por cliente**: total pago no ano ÷ clientes considerados.
- **Reduções no período** e **Aumentos no período**: somas das variações de valor registradas nos movimentos, classificadas pelo sinal real da diferença (não pelo nome do tipo).

## Detalhes técnicos

**`src/lib/parceiro.financeiro.ts`**
- `LinhaFechamentoParceiro` perde `notaId`; `FechamentoParceiro` ganha `cicloInicio`, `cicloFim`, `vencimento`, `vencimentosDivergentes: boolean` e `notaId`, derivados dos itens do próprio parceiro (menor `ciclo_inicio`, maior `ciclo_fim`, primeira nota encontrada em `notaPorLancamento`). `status` por linha permanece.
- Vencimento do fechamento: quando todos os itens têm a mesma data, mostra a data. Quando há datas diferentes, `vencimentosDivergentes` fica verdadeiro e a linha mostra a **mais próxima** seguida de "(+N datas)", com as datas completas na dica ao passar o mouse — nada de escolher uma "predominante" e esconder o resto. Cada linha de cliente continua mostrando seu próprio vencimento ao expandir.
- Novo tipo `RelatorioParceiro` com `pagoPorMes`, `totalSistema`, `totalAcompanhamento`, `ticketMedio`, `reducoes`, `aumentos`, montado por função pura `montarRelatorioParceiro(...)` — lista branca: nada de custo WTS, margem, lucro ou desconto de escala.

**`src/lib/parceiro.functions.ts`**
- `getFinanceiroParceiro` passa a devolver também `relatorio`, calculado a partir de `elora_financeiro` (id, status, valor, competencia/vencimento) dos lançamentos já restritos ao parceiro e dos `payload_snapshot` dos itens (campos `sistema`/`acompanhamento`), mais os movimentos dos clientes do parceiro para os deltas. `totalSistema`/`totalAcompanhamento` só retornam quando `parceiro_ve_valores()` é verdadeiro.

**`src/routes/parceiro.tsx`**
- `searchSchema` ganha `periodo` (`mes` | `mesPassado` | `trimestre` | `custom`, padrão `mes`), `indicador` (`""` | `entradas` | `saidas` | `excedentes`) e `sub` (`fechamentos` | `relatorios`), todos com `fallback`. `de`/`ate` continuam como estado local, usados só em `custom`; um `useMemo` converte o preset em intervalo efetivo.
- `clientesFiltrados` aplica o filtro do indicador ativo, depois de busca/status. Excedente por cliente vem do mesmo cálculo que já alimenta `totalExcedentes`.
- Cards de indicador viram botões acessíveis (`role="button"`, `aria-pressed`), com destaque via token de cor — sem cor fixa.
- Pop-up da licença base recebe a linha de acompanhamento sob `veValores`.
- `FinanceiroParceiro` ganha o alternador e o novo componente `RelatoriosParceiro`, usando os mesmos componentes de gráfico (Recharts) já presentes no arquivo. Hooks sempre no topo, antes dos retornos antecipados.

**Testes** em `src/lib/__tests__/financeiro-parceiro.test.ts`: NF/ciclo/vencimento no nível do fechamento, ausência de `notaId` por linha, cálculo de reduções/aumentos pelo sinal do delta e bloqueio da composição sem permissão.

**Validação**: 390/834/1440, claro e escuro; competência fechada mostrando ciclo/vencimento/NF; nenhuma NF em linha de cliente; troca entre os quatro períodos; clique e desclique nos três indicadores; Relatórios com e sem permissão de composição.
