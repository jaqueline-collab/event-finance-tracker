# Calculadora de proposta + "Plano atual" indisponível para clientes cancelados

## Parte A — Calculadora de proposta do parceiro

### Plano
- O seletor continua listando só os planos vinculados ao parceiro (já garantido no servidor pelo filtro de `parceiro_ids`).
- Ao escolher um plano, os campos são pré-preenchidos com as franquias dele (usuários, contatos, canais, módulos inclusos).

### WhatsApp em duas perguntas
- "Quantos números vamos conectar?" (total de números WhatsApp).
- "Quantos desses são API Oficial?" (limitado ao total; nunca maior).
- O restante vira Z-API automaticamente e é exibido como um valor calculado, sem campo editável.
- O excedente de canais WhatsApp continua sendo calculado sobre o total de números acima da franquia do plano.
- O custo de Z-API do plano é aplicado apenas sobre a quantidade de números não oficiais.
- Instagram e Messenger seguem exatamente como estão hoje.

### Acompanhamento
- O campo "Acompanhamento mensal" sai da tela e do cálculo da calculadora.

### Novo bloco "Sua margem"
- Tipo: Valor fixo em R$ ou Percentual %.
- Base de aplicação: só mensalidade, ou mensalidade + setup.
- A margem é somada ao valor final; percentual incide sobre a base escolhida.

### Resumo lateral (tempo real)
- Setup
- Mensalidade base
- Excedentes (com a linha de Z-API discriminada)
- Margem aplicada
- Total a cobrar do cliente (mensalidade + excedentes + margem; setup mostrado à parte, e somado na margem apenas quando a base escolhida o inclui)

### Visibilidade
- A calculadora sempre mostra o custo-base (mensalidade + excedentes, antes da margem), independentemente da permissão de composição usada na aba de clientes. É uma ferramenta de simulação, não visualização de clientes ativos.

## Parte B — "Plano atual" indisponível para clientes em Churn

- Na tabela de Clientes da Área do Parceiro, clientes com churn (data de churn preenchida) têm o botão "Plano atual" desabilitado, esmaecido e sem ação, com dica "Sem plano vigente" ao passar o mouse — mantendo o alinhamento e o espaçamento da linha iguais aos demais.
- "Histórico" continua funcionando normalmente para esses clientes.
- Nenhuma mudança de cálculo ou de dados: restrição apenas visual.

## Detalhes técnicos

- `src/lib/parceiro.calculadora.ts`: a configuração passa a ter `canaisWhatsTotal` e `canaisWhatsOficiais`; `canaisZapi` deriva de `total - oficiais`. Remove `acompanhamento` da configuração e passa `valorAcompanhamento: 0` na simulação. Nova função de margem (`fixa` | `percentual`, base `mensalidade` | `mensalidade_setup`) devolvendo `margem` e `totalCobrado`, sem tocar em custo WTS, margem interna, lucro ou desconto de escala.
- `src/routes/parceiro.tsx` (componente `CalculadoraParceiro`): campos de WhatsApp em duas entradas com validação de máximo, exibição da quantidade Z-API derivada, bloco "Sua margem" e novo resumo lateral. Remoção do campo de acompanhamento.
- `src/routes/parceiro.tsx` (tabela de clientes): botão "Plano atual" com `disabled` quando `c.dataChurn` existir.
- Testes em `src/lib/__tests__/calculadora-parceiro.test.ts`: Z-API só sobre números não oficiais, margem fixa e percentual nas duas bases.

## Validação

- Pré-preenchimento correto ao trocar de plano; planos não vinculados ausentes do seletor.
- WhatsApp com números oficiais e não oficiais: Z-API cobrado só sobre os não oficiais.
- Margem fixa e percentual nas duas bases, conferindo o total.
- "Acompanhamento mensal" ausente da calculadora.
- "Plano atual" funcional em cliente ativo e indisponível em cliente com churn (ex.: Dr. Pedro Augusto, Dra. Cecilia Bunn); "Histórico" acessível nos dois casos.
- Celular (390), tablet (834) e computador (1440), temas claro e escuro.
