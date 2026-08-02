# Permitir gerar fechamento antes do ciclo encerrar

Hoje a tela de Fechamento só deixa fechar competências cujo ciclo do cliente já terminou. Clientes com ciclo em aberto ficam na lista de "aguardando ciclo fechar" e a competência do mês corrente nem aparece no seletor. A mudança libera a antecipação, sempre, mantendo o valor cheio do ciclo.

## O que muda na tela

- O seletor de competências passa a listar também os meses cujo ciclo ainda está em aberto (mês corrente incluído).
- Todos os clientes ativos naquela competência entram na lista de seleção do fechamento, mesmo com ciclo em aberto — nada mais fica bloqueado em "aguardando".
- Clientes com ciclo ainda aberto ganham um selo visual de aviso ("ciclo em aberto — encerra em DD/MM"), para ficar claro que aquilo é uma antecipação.
- O cabeçalho do fechamento mostra um aviso quando a competência ainda não encerrou.
- Some o toast "Ciclo ainda em aberto — abrindo <outro mês>": a competência clicada é sempre respeitada.

## Regras de cálculo

- Valor cheio do ciclo, idêntico ao fechamento normal. Nenhuma proporcionalidade nova, nenhuma mudança em receita, descontos, MAU excedente ou vencimento.
- Fechamentos já gerados não são tocados.
- Se o cliente sofrer upgrade/churn depois da antecipação, o fechamento gerado continua como foi gravado — ajuste manual, como hoje.

## Detalhes técnicos

Arquivo único: `src/routes/resumo.tsx`.

- `clienteElegivelParaFechamento` deixa de exigir `ciclo.fim <= hoje`; passa a ser só `clienteAtivoNoCiclo`. A informação "ciclo encerrado ou não" vira um flag separado (`cicloEncerrado`) usado apenas para rótulos.
- `opcoesFechamento`: contar como elegível qualquer cliente ativo no ciclo; manter a contagem `aguardando` apenas como informativo de "em aberto" no rótulo da opção.
- `fechamentoData`: `ativos` passa a ser `ativosTodos`; `aguardandoCicloFechar` vira lista informativa (clientes com ciclo em aberto) usada só para o selo/aviso.
- `abrirNovoFechamento`: remover o fallback que troca a competência escolhida por outra elegível.
- Sem alteração em `src/lib/calc/*`, na store, nas funções de servidor ou no banco.
