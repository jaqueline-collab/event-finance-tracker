# Resumo financeiro no Registrar Movimento

Hoje, ao registrar um upgrade/downgrade, não dá para saber quanto a conta do cliente vai mudar — só depois de salvar. A ideia é mostrar isso antes de confirmar.

## O que aparece na tela

Um bloco de resumo dentro da janela "Registrar Movimento", logo acima da Observação, atualizado em tempo real conforme os campos são preenchidos:

```text
Impacto na mensalidade
Valor atual        R$ 1.240,00
Alteração          + R$ 180,00
Valor após         R$ 1.420,00
```

- A "Alteração" fica em verde quando aumenta e em vermelho quando reduz; zero mostra "Sem alteração de valor".
- Abaixo, uma linha curta detalhando o que gerou a diferença (ex.: "5 canais WhatsApp adicionais, 5 canais Z-API adicionais, Transcrição IA ligada").
- Se ainda não houver nada preenchido, o bloco mostra apenas o valor atual.
- Só aparece para os tipos de movimento que mudam a cobrança (upgrade, downgrade, troca de plano e ativação/desativação de módulos). Em churn, mostra o valor que deixa de ser cobrado.

## Como o valor é calculado

Usa exatamente a mesma conta que o sistema já usa para o faturamento — nada de fórmula paralela:

- Valor atual: cálculo de receita mensal do cliente como ele está cadastrado hoje.
- Valor após: aplica as mudanças digitadas (somando os deltas de canais, usuários, contatos, módulos e eventual troca de plano) em uma cópia do cliente em memória e roda o mesmo cálculo.
- Alteração: diferença entre os dois.

Nada é gravado enquanto o resumo é exibido; é só simulação de tela. O botão "Registrar Ação" continua funcionando igual.

## Uma única fonte de verdade para o cálculo

A prévia não pode ter conta própria. A regra que transforma "o que mudou" no cliente resultante fica em **uma função compartilhada só**:

- Se a store já tiver uma função utilitária para isso, ela é importada e usada na prévia.
- Se a regra estiver escrita dentro de `addMovimento`, ela é primeiro extraída para essa função compartilhada, e `addMovimento` passa a chamá-la também.

Assim, se um dia alguém mudar a regra, prévia e cobrança real mudam juntas.

## Detalhes técnicos

- Arquivo: `src/routes/clientes.tsx`, dentro do Dialog de movimento (linhas ~1300-1388).
- Extrair de `addMovimento` (`src/lib/store.ts`) a aplicação de deltas para `aplicarMovimentoNoCliente(cliente, movimento): Cliente` em `src/lib/calc/` (ou reutilizar a existente, se houver), usada pela store e pela prévia.
- Um `useMemo` monta o cliente simulado com essa função a partir de `movForm` e chama `receitaMensalCliente(cliente, planos, custos)` para os dois cenários.
- A linha de detalhamento reaproveita `explicarReceitaCliente` de `src/lib/calc/receita.ts` comparando os itens antes/depois, ou lista simples dos campos alterados.
- Formatação com `formatBRL` / `formatBRLPreciso` já existentes.
- Sem mudança de banco, de server functions ou de regra de negócio.
