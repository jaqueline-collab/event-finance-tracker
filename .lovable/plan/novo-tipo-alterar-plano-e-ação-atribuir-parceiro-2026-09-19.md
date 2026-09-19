# Novo tipo "Alterar plano" e ação "Atribuir parceiro"

## 1. Tipo de ação "Alterar plano"

No diálogo Registrar Movimento, a lista de Tipo de Ação passa a ter, além de Setup / Ativação, Upgrade, Downgrade, Churn, Serviço avulso e Ajustar acompanhamento:

- **Alterar plano**

Funciona exatamente como Upgrade/Downgrade: seletor "Novo Plano", pergunta "Quando a mudança de plano entra em vigor?" (Este ciclo / Próximo ciclo), a pergunta "Como cobrar neste ciclo?" (Valor integral / Proporcional) quando for "Este ciclo", campos de canais/usuários/contatos tratados como diferenças, módulos opcionais, pergunta de acompanhamento próprio (manter / padrão do plano novo) e "Impacto na mensalidade" com o mesmo cálculo.

A diferença é só a classificação: o movimento fica gravado como "Alterar plano" e aparece com esse rótulo próprio no histórico do cliente, no pop-up de histórico da Área do Parceiro e em qualquer contagem por categoria — nunca somado a Upgrade nem a Downgrade.

Também fica disponível na troca de plano em massa, com o mesmo comportamento.

## 2. Ação "Atribuir parceiro" na lista de Clientes

No menu de três pontinhos de cada linha da Carteira Ativa entra o item **Atribuir parceiro**, que abre um diálogo próprio, separado do Registrar Movimento:

- "Parceiro atual: ..." (somente leitura, mostra "Sem parceiro" quando não houver)
- Seletor "Novo parceiro": parceiros cadastrados + "Sem parceiro (N/A)"
- Data
- Observação (opcional)

Sem "Impacto na mensalidade" — a troca de parceiro não altera nenhum valor cobrado.

Ao salvar:
- o cadastro do cliente passa a apontar para o parceiro novo imediatamente;
- é gravado um movimento no histórico do cliente com data, parceiro anterior e parceiro novo, rótulo **Alteração de parceiro**;
- a Área do Parceiro passa a listar o cliente para o parceiro novo daí em diante;
- fechamentos, composições e lançamentos já gerados antes da troca ficam intocados — continuam exatamente como estavam.

## Detalhes técnicos

- Migração aditiva `0015_movimento_parceiro.sql` em `elora_movimentos`: colunas opcionais `parceiro_anterior_id text` e `parceiro_novo_id text` (NULL, sem default, sem FK obrigatória para não travar parceiros removidos). Depois, regenerar `src/integrations/supabase/types.ts`. Nenhuma alteração em tabelas financeiras.
- `src/lib/types.ts`: `TipoMovimento` ganha `"alterar_plano"` e `"parceiro"`; `Movimento` ganha `parceiroAnteriorId?: string | null` e `parceiroNovoId?: string | null`.
- `src/lib/movimentos.schemas.ts`: campos novos no `movimentoRowSchema` (nullable/optional). `clientePatchSchema` já aceita `parceiro_id`, então a troca reaproveita `registrarMovimento` (movimento + patch do cliente numa chamada só).
- `src/lib/calc/movimento.ts`: `"alterar_plano"` entra na mesma família de deltas de `upgrade`/`downgrade` (`isDelta`); `"parceiro"` não altera nenhum campo de recurso nem valor.
- `src/routes/clientes.tsx`:
  - `tiposMovimento` ganha `{ value: "alterar_plano", label: "Alterar plano" }` com cor própria (neutra, distinta de upgrade/downgrade);
  - toda checagem hoje escrita como `tipo === "upgrade" || tipo === "downgrade"` (delta em `openAcaoModal`, `tiposComImpacto`, pergunta de acompanhamento, modo lote) passa a incluir `"alterar_plano"`;
  - novo estado/diálogo `atribuirParceiroId` com o formulário simples descrito acima, gravando via `registrarMovimento` (movimento tipo `"parceiro"` + `clientePatch: { parceiro_id }`) e atualizando a store local;
  - novo item no `DropdownMenu` da linha da tabela.
- `src/routes/parceiro.tsx`: mapa de rótulos de tipo no histórico passa a cobrir `"acompanhamento"`, `"alterar_plano"` ("Alteração de plano") e `"parceiro"` ("Alteração de parceiro"). O select de movimentos do painel do parceiro continua sem colunas de valor; os dois campos novos de parceiro não expõem preço.
- `src/lib/mappers.ts`: ida e volta dos campos novos.

## Validação

- Registrar "Alterar plano" num cliente de teste, conferir rótulo próprio no histórico (não Upgrade/Downgrade) mesmo com o valor mudando, e conferir vigência/cobrança e o Impacto na mensalidade.
- Atribuir "Rabbit Agency" ao Dr. Lucas Moura e conferir que ele aparece na Área do Parceiro da Rabbit; conferir que um fechamento anterior à troca continua íntegro.
- Registros de teste removidos ao final; nada financeiro alterado.
- `bunx tsgo --noEmit`, `bunx vitest run`, build OK; navegador em 390/834/1440, temas claro e escuro.
