# Notas Fiscais dentro do Financeiro + correção da Calculadora

## 1. Bug crítico da Calculadora — causa raiz confirmada

O componente `CalculadoraParceiro` tem três retornos antecipados (carregando, erro, nenhum plano) e, **depois deles**, ainda chama `useState` para controlar o pop-up "O que inclui a licença base":

```
if (carregando) return <Skeleton/>      // linha 917
if (erro) return <Alert/>               // linha 918
if (!plano) return <Card/>              // linha 927
...
const [licencaAberta, setLicencaAberta] = useState(false)   // linha 946
```

Na primeira renderização a lista de planos ainda não chegou (`carregando = true`), o componente sai antes e registra 4 hooks. Quando os planos chegam, ele passa pelos retornos e registra 5 hooks. O React vê menos hooks numa renderização do que na outra e derruba a página com o erro #300. Ao dar refresh, os dados às vezes já vêm prontos e o erro não aparece.

**Correção:** mover `const [licencaAberta, setLicencaAberta] = useState(false)` para o topo do componente, junto dos demais `useState`, antes de qualquer `if`. Nenhuma outra lógica muda.

Também vou revisar o arquivo inteiro para garantir que nenhum outro hook esteja abaixo de um retorno condicional.

## 2. "Mensalidade base" e o acompanhamento — não é bug

Consultei os planos cadastrados. Dos dois planos da Rabbit Agency:

- **Rabbit Essencial** — acompanhamento padrão R$ 200,00
- **Desativado - Rabbit** — acompanhamento padrão R$ 0,00

Os outros três planos do sistema também estão com acompanhamento zerado. A lógica do card lê o acompanhamento do plano e soma na mensalidade base (`licença + acompanhamento`), então o plano que estava selecionado na sua tela era um com acompanhamento R$ 0,00 — por isso apareceu só R$ 199,99, exatamente o comportamento previsto.

Vou confirmar na tela, depois do bug corrigido, que escolhendo **Rabbit Essencial** o card mostra **R$ 399,99** e o pop-up abre normalmente. Se não mostrar, aí sim trato como bug e corrijo.

## 3. Notas Fiscais dentro de Financeiro

- Remover "Notas Fiscais" do menu superior da Área do Parceiro (e da navegação por endereço).
- Na aba **Financeiro**, ao expandir uma competência, cada linha de cliente ganha três informações novas:
  - **Vencimento** — data de vencimento daquela cobrança.
  - **Status** — selo "Pago" ou "Pendente", o mesmo status do Financeiro interno.
  - **NF** — botão de baixar quando existe nota anexada cobrindo aquele lançamento; sem nota, aparece "—" (sem botão).
- O download continua passando pelo servidor autenticado, conferindo que a nota pertence ao parceiro logado. Cliente individual segue sem acesso a nota nenhuma.

## Detalhes técnicos

- `src/routes/parceiro.tsx`: hook `licencaAberta` movido para o topo de `CalculadoraParceiro`; remoção da aba `notas` do enum de abas, do menu e do componente `NotasFiscaisParceiro`.
- `src/lib/parceiro.financeiro.ts`: `LinhaFechamentoParceiro` ganha `status: "pago" | "pendente" | null` e `notaId: string | null`; `montarFechamentosParceiro` recebe mapas `statusPorLancamento` e `notaPorLancamento`, alimentados a partir de `elora_fechamento_itens.lancamento_financeiro_id`.
- `src/lib/parceiro.functions.ts` (`getFinanceiroParceiro`): buscar `elora_financeiro` (id, status) e `elora_nota_fiscal_lancamentos` (lancamento_id, nota_id) apenas dos lançamentos das linhas do próprio parceiro, via cliente admin, sem expor valores de custo.
- `baixarNotaFiscal` em `src/lib/notas-fiscais.functions.ts` é reaproveitado sem alteração; `listarNotasParceiro` deixa de ser usado pela UI (mantido no servidor).
- Testes em `src/lib/__tests__/financeiro-parceiro.test.ts` cobrindo status/NF nas linhas e a lista branca (nada de custo/margem/lucro/WTS).
- Validação em 390/834/1440, claro e escuro, incluindo trocar de plano várias vezes, abrir/fechar o pop-up e mexer em Setup e margem sem refresh.
