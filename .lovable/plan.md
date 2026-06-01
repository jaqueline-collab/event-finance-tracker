
## 1) Tela de Parceiros — abrir detalhes, editar e excluir

Hoje o card de parceiro só tem ícone de lixeira. Vou ajustar `src/routes/parceiros.tsx`:

- Tornar o card clicável → abre um **Dialog "Detalhes do Parceiro"** mostrando nome, email, celular, data de criação, observação e planos vinculados (com link rápido para a tela de Planos).
- No header do Dialog, dois botões: **Editar** (reaproveita o formulário já existente, pré-preenchido) e **Excluir** (com confirmação).
- O ícone de lixeira sai do card e passa a viver dentro do Dialog (evita exclusão acidental).
- O formulário ganha modo edição (`editId`) usando o `updateParceiro` que já existe no store. Hoje o `addParceiro` é o único caminho — vou plugar o `updateParceiro` no `handleSave`.
- Adicionar campo **Observação** no formulário (já existe no tipo, mas não é editável na UI).

## 2) Custo da infraestrutura não soma canais extras (Whats/Insta/Messenger)

Na simulação em tempo real do "Novo Cliente" (`src/routes/clientes.tsx`), a regra atual considera "1 grátis de cada tipo" para o custo Helena, ignorando o `canaisInclusos` do plano e os novos campos por tipo. No screenshot, o plano tem 1 canal incluso e o cliente cadastrou 1 Whats + 1 Insta + 1 Messenger = 3 canais → custo Helena deveria contabilizar 2 canais extras, mas mostra zero.

Correção: o custo de canais extras passa a usar a **mesma lógica do faturamento** — total de canais por tipo menos o que está incluso por tipo no plano (ver item 3). Soma todos os excedentes e aplica `calcularCustoExtraCanaisHelena` com o `precoCanaisExc` correspondente (ou, no modelo novo, soma por tipo usando o preço de cada tipo).

A linha "Canais extras (+N)" no card de Simulação também passa a refletir o total real de excedentes por tipo.

## 3) Planos — franquia e preço por tipo de canal (Whats / Insta / Messenger)

Hoje o plano tem só `canaisInclusos` (genérico) e `valorCanaisExc`/`precoCanaisExc` únicos. Vou adicionar configuração **por tipo**:

Novos campos no `Plano` (`src/lib/types.ts`) e no banco (`elora_planos`):
- `canaisWhatsInclusos`, `canaisInstaInclusos`, `canaisMessengerInclusos` (inteiros, default 0)
- `precoCanalWhatsExc`, `precoCanalInstaExc`, `precoCanalMessengerExc` (custo Helena por canal de cada tipo)
- `valorCanalWhatsExc`, `valorCanalInstaExc`, `valorCanalMessengerExc` (preço cobrado do cliente)

Os campos antigos (`canaisInclusos`, `precoCanaisExc`, `valorCanaisExc`) ficam mantidos como fallback/compat para planos antigos.

Mudanças de UI:
- **`src/routes/planos.tsx`**: a seção "Franquias Incluídas" ganha 3 inputs (Whats / Insta / Messenger) no lugar do campo único "Canais Incluídos". A seção "Preços de Venda" ganha 3 colunas de canal extra (uma por tipo) com custo Helena e valor cliente lado a lado, substituindo o campo único atual.
- **`src/routes/clientes.tsx`**: faturamento e custo de canais extras passam a calcular por tipo:
  `excWhats = max(0, canaisWhats - plano.canaisWhatsInclusos)` (e idem para Insta/Messenger), multiplicando pelo preço/valor do tipo correspondente. A linha "Canais extras" detalha no tooltip a quebra por tipo.

## 4) Propagar alteração de plano para clientes já vinculados

Hoje `updatePlano` só atualiza o plano. Para o usuário, "alterar o plano" deve refletir nos clientes existentes (mudança de preço, franquia, módulos inclusos).

Como o cliente já lê os campos do plano em tempo real (na simulação de cadastro), a maior parte da propagação é automática: ao editar o plano, qualquer tela que olhe `plano.valorMensal`, `plano.canaisWhatsInclusos`, `plano.precoIA`, etc. já mostra os novos valores para todos os clientes daquele plano.

O que falta — e vou implementar — é registrar um movimento de "ajuste" automático para auditoria e atualizar campos do cliente que foram copiados no momento do cadastro (por ex. `valorAcompanhamento` quando o plano muda de mensalidade base). No `updatePlano` do store (`src/lib/store.ts`):

1. Antes de salvar, compara o plano antigo com o novo.
2. Para cada cliente cujo `planoId` é o plano alterado:
   - Cria um `Movimento` do tipo `ajuste` com `data = hoje`, `planoId = id` e observação automática: "Plano '<nome>' atualizado — valores recalculados".
3. Não sobrescreve dados editados manualmente do cliente (canais, usuários, módulos opcionais ativados) — esses continuam respeitados; só os preços/franquias do plano mudam, e a simulação refaz a conta automaticamente.

## Resumo das alterações de arquivo

- `src/routes/parceiros.tsx` — modal de detalhes, edição, exclusão com confirmação, campo observação.
- `src/lib/types.ts` — novos campos por tipo de canal no `Plano`.
- `src/routes/planos.tsx` — formulário com franquia e preço por tipo (Whats/Insta/Messenger).
- `src/routes/clientes.tsx` — cálculo de custo e faturamento de canais usando franquia/preço por tipo.
- `src/lib/store.ts` — `updatePlano` registra movimento de ajuste para clientes vinculados; mappers DB ↔ tipo atualizados.
- **Migration Supabase** — adicionar colunas em `elora_planos` para os 3 tipos de canal (franquia + custo + valor).

## Pergunta antes de implementar

Sobre o item 4 (propagar mudança do plano para clientes): você quer só o **movimento automático de auditoria** (sem mexer em dados do cliente, deixando a simulação recalcular sozinha), ou também quer **resetar os campos do cliente para o que está incluso no plano** (ex.: se o plano agora inclui IA, ligar o `agentesIA` em todos os clientes)? O segundo caminho é mais invasivo e pode sobrescrever ajustes manuais — costuma ser melhor o primeiro.
