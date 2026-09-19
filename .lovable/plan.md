# Acompanhamento no plano + trava de módulos opcionais

## 1. Investigação: o campo de acompanhamento (resposta)

O campo **nunca existiu** na tela de Planos. Toda a história do arquivo da tela de Planos não tem nenhuma referência a "acompanhamento", e a última alteração (botão Duplicar) apenas acrescentou o botão — nada foi removido, escondido ou movido.

Hoje o acompanhamento é **por cliente**: no cadastro do cliente, na seção "Valores Comerciais", campo "Acompanhamento Mensal Recorrente", ao lado da taxa de setup. É esse valor que alimenta o card "Acompanhamento" do Dashboard e a linha de acompanhamento dos fechamentos.

Como você pediu, vamos criar o campo também no plano — como valor padrão.

## 2. Acompanhamento padrão no plano

- Novo campo no formulário de plano: **"Acompanhamento mensal padrão (R$)"**, na mesma seção dos valores (mensalidade / setup / vencimento). Opcional, começa vazio (0).
- No cadastro do cliente, ao escolher um plano, o campo "Acompanhamento Mensal Recorrente" é **pré-preenchido** com o valor do plano quando o cliente ainda não tem valor próprio. O operador pode alterar livremente — o valor do cliente sempre manda.
- Clientes já cadastrados **não mudam**: o valor que está gravado neles continua valendo, nada é recalculado nem sobrescrito.
- Nenhum cálculo de MRR, fechamento ou histórico muda: o cálculo continua lendo o valor do cliente.
- A duplicação de plano copia esse campo junto.

## 3. Trava "sem Módulos Opcionais" no plano

- Nova chave no formulário de plano, na seção "Módulos Opcionais Incluídos": **"Este plano não permite módulos opcionais"**.
- Quando ligada: os controles de Agentes IA, ASAAS, Transcrição e Z-API ficam desabilitados e esmaecidos no próprio formulário do plano, com um aviso curto.
- No cadastro de um cliente vinculado a esse plano: a seção "Módulos Opcionais Ativados" não oferece ativação — os controles ficam desabilitados, com a explicação "O plano X não permite módulos opcionais".
- **Nada é removido de quem já tem**: se o cliente já tinha um opcional ativo (IA, ASAAS, Transcrição ou canais Z-API), ele continua ativo, visível e contabilizado normalmente. A trava só impede ligar algo novo. O que já estava ligado pode ser desligado, mas não religado.
- Planos sem a marcação seguem funcionando exatamente como hoje.

## Validação

- Criar um plano com a trava ligada e confirmar que, no cadastro de um cliente vinculado a ele, não dá para ativar nenhum opcional.
- Confirmar que um plano existente (sem a marcação) continua permitindo os opcionais normalmente.
- Confirmar que um cliente que já tinha opcionais ativos, cujo plano passa a ter a trava, continua com eles ativos e com o mesmo valor.
- Confirmar que o acompanhamento padrão do plano preenche o campo do cliente em um cadastro novo e não altera nenhum cliente existente.
- Conferir em 390 / 834 / 1440 px, tema claro e escuro.

## Detalhes técnicos

- Migração aditiva em `elora_planos`: `valor_acompanhamento numeric NOT NULL DEFAULT 0` e `permite_modulos_opcionais boolean NOT NULL DEFAULT true`. Sem alterar nenhuma coluna existente e sem tocar em `elora_clientes`, `elora_fechamentos`, `elora_fechamento_itens` ou `elora_financeiro`. Types regenerados.
- `src/lib/types.ts` (`Plano`), `src/lib/mappers.ts` e `src/lib/store.ts` ganham os dois campos, com defaults tolerantes para planos antigos (`?? 0`, `?? true`).
- `src/routes/planos.tsx`: dois campos novos em `PlanoForm` / `defaultForm` / `startEdit` / `handleSave`; `startDuplicate` já copia por herdar de `startEdit`. Os controles de módulos ficam `disabled` quando a trava está ligada.
- `src/routes/clientes.tsx`: `handlePlanoChange` passa a preencher `valorAcompanhamento` a partir do plano quando o campo estiver zerado; a seção "Módulos Opcionais Ativados" recebe, por opcional, `disabled = !planoPermite && !valorJaAtivo` (para Z-API: mínimo travado no valor já contratado), com texto explicativo.
- Nenhuma alteração em `src/lib/calc/receita.ts`, `resumo.tsx` ou qualquer caminho de fechamento — a trava é só de interface e o acompanhamento do plano é apenas um valor padrão.
