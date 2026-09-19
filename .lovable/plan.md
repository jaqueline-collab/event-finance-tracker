# Ajustar acompanhamento direto e perguntar na troca de plano

## 1. Novo tipo de ação "Ajustar acompanhamento"

- No diálogo "Registrar Movimento", o campo "Tipo de Ação" ganha a opção **Ajustar acompanhamento**.
- Ao escolher esse tipo, o diálogo simplifica: somem "Novo Plano", as perguntas de vigência/cobrança, os campos de canais, usuários, contatos e os módulos opcionais. Fica apenas **"Novo valor de acompanhamento (R$)"**, já preenchido com o valor atual do cliente, mais Data e Observação.
- "Impacto na mensalidade" mostra só a diferença desse valor: valor atual, alteração e valor após, com a linha "Acompanhamento: R$ antes → R$ depois".
- Ao salvar, grava um movimento normal no histórico do cliente (mesma tabela dos demais), com data, valor e observação — aparece no histórico do cliente e no pop-up de histórico da Área do Parceiro, com o rótulo "Ajuste de acompanhamento".
- O cadastro do cliente passa a ter o novo valor de acompanhamento; nada mais é tocado.

## 2. Troca de plano com acompanhamento próprio

- Ao escolher um plano novo em Upgrade/Downgrade, se o cliente tiver acompanhamento próprio (valor maior que zero), aparece a pergunta:
  "Este cliente tem acompanhamento próprio (R$ X). O que fazer?"
  - **Manter o valor atual (R$ X)** — padrão selecionado; só a licença do plano muda.
  - **Atualizar para o padrão do plano novo (R$ Y)** — o acompanhamento passa a valer o padrão.
- Cliente sem acompanhamento próprio (vazio/zero): continua automático, herda o padrão do plano novo sem perguntar.
- "Impacto na mensalidade" recalcula em tempo real conforme a escolha, com a linha de acompanhamento somando ao "Valor após".

## 3. Troca em massa

- No modo de seleção em massa, se **algum** cliente selecionado tiver acompanhamento próprio, a mesma pergunta aparece **uma vez** para o lote:
  "Alguns clientes selecionados têm acompanhamento próprio. O que fazer com esses valores?"
  - **Manter o valor de cada cliente** — quem tem valor próprio conserva; quem não tem recebe o padrão do plano novo.
  - **Atualizar todos para o padrão do plano novo** — sobrescreve inclusive quem tinha valor negociado.
- A lista "Impacto na mensalidade por cliente" reflete a escolha linha por linha antes de confirmar; é possível desmarcar clientes na tabela e tratá-los depois individualmente.

## Validação

- Registrar "Ajustar acompanhamento" isolado num cliente de teste e conferir histórico (data e valor) e o plano intacto.
- Trocar o plano do Dr. Lucas Moura (R$ 250 próprios) e conferir a pergunta com os dois valores corretos, testando cada opção na prévia.
- Trocar o plano de um cliente sem acompanhamento e conferir que não há pergunta e o padrão é aplicado.
- Troca em massa com grupo misto: pergunta única e impacto correto por cliente.
- Conferir 390, 834 e 1440 px, temas claro e escuro. Nenhum dado financeiro existente é alterado nos testes.

## Detalhes técnicos

- Migração aditiva `0014`: coluna `valor_acompanhamento numeric NULL` em `elora_movimentos` (sem default destrutivo; movimentos antigos ficam nulos). `tipo` é texto livre, sem CHECK, então o novo valor `acompanhamento` não exige alteração de constraint.
- `src/lib/types.ts`: `TipoMovimento` ganha `"acompanhamento"`; `Movimento` ganha `valorAcompanhamento?: number | null`. Mapeamento em `src/lib/mappers.ts` e `movimentoToDb` em `src/lib/store.ts`; schema em `src/lib/movimentos.schemas.ts` (`valor_acompanhamento: z.number().nullable().optional()`).
- `src/lib/calc/movimento.ts` (`calcularPatchMovimento`): quando `m.valorAcompanhamento` é informado (não nulo), o patch define `valorAcompanhamento` explicitamente e tem precedência sobre a herança automática do plano; a regra atual (herdar o padrão do plano novo quando o cliente está zerado) permanece para quando o campo não vem.
- `src/routes/clientes.tsx`: `tiposMovimento` ganha a entrada "Ajustar acompanhamento"; `movForm` ganha `valorAcompanhamento: string` e `acompanhamentoRegra: "manter" | "padrao"`. O diálogo esconde plano/recursos/módulos quando `tipo === "acompanhamento"`. `simularMovimentoCliente` passa `valorAcompanhamento` ao movimento simulado conforme tipo/regra (`manter` → valor atual do cliente; `padrao` → `plano.valorAcompanhamento ?? 0`), e a linha de acompanhamento já existente cobre a exibição. `handleSaveMovimento` e `handleSaveLote` enviam o mesmo campo por cliente.
- A pergunta individual só renderiza quando `movForm.planoId` está preenchido e `cliente.valorAcompanhamento > 0`; a de lote quando algum `acaoLoteIds` atende a condição.
- O rótulo do novo tipo entra em `tiposMovimento`, usado tanto na lista de histórico do cliente quanto na Área do Parceiro (`src/routes/parceiro.tsx` lê o mesmo dado de movimentos).
- Nenhum fechamento, lançamento financeiro ou dado existente é alterado.
