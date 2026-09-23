# Painel em grade, formato de número, modelos de painel, "Ver como" e busca no Treinamento

## 1. Construtor de painel em grade

O "Meu Dash" deixa de ser lista com setas e vira uma grade de 12 colunas:

- Cada widget ocupa uma área (coluna inicial, linha inicial, largura e altura em células).
- Arrastar pelo cabeçalho do bloco move; arrastar o canto inferior direito redimensiona (mínimo 3x2).
- Sem sobreposição: ao soltar um bloco sobre outro, os demais são empurrados para baixo e a grade se compacta para cima, como em qualquer painel de dashboard.
- Posição e tamanho são salvos junto com o widget e recarregam iguais.
- No painel do cliente a mesma grade é renderizada; em telas estreitas os blocos empilham em coluna única seguindo a ordem de cima para baixo e da esquerda para a direita.

## 2. Formato do bloco métrico

O bloco métrico ganha o campo "Formato do número":

- **Inteiro** — 162
- **Valor financeiro** — R$ 12.345,67 (padrão brasileiro)

Continua valendo o formato de duração já existente nos tempos médios. Blocos antigos seguem como inteiro.

## 3. Modelos de painel

Nova seção "Modelos de painel" na tela Configurar API:

- Modelo = grade completa de widgets com nome próprio (ex.: "Modelo Clínica Essencial").
- Criar do zero (grade vazia, editada no mesmo construtor) ou "Salvar painel atual como modelo" a partir de um cliente.
- Aplicar a um cliente pede confirmação: "Isso substitui todos os widgets atuais deste cliente pelos do modelo. Confirmar?" — os widgets antigos são apagados e substituídos.
- A cópia é independente: editar o modelo depois não muda painéis já aplicados, e editar o painel de um cliente não muda o modelo nem outros clientes.
- Na lista de clientes, a barra de seleção em massa ganha "Aplicar modelo de painel", com confirmação "Isso substitui os widgets de N clientes selecionados. Confirmar?".

Referências do widget (rótulo, painel, sequência) só são copiadas quando existem no cliente de destino; as que não existirem entram como "não configurado" em vez de apontar para dados de outro cliente.

## 4. Atalho "Ver como" no menu lateral

Novo item **Ver como** no grupo Gestão, com dois caminhos:

- **Ver como parceiro** — busca por nome e abre a Área do Parceiro em modo administrador somente leitura.
- **Ver como cliente** — busca por nome e abre a Área do Cliente correspondente.

Mesmo comportamento de hoje, sem precisar abrir o cadastro antes. Visível só para quem já pode ver parceiros/clientes.

## 5. Busca e filtros no Treinamento

Nas três telas (parceiro, cliente e administração interna):

- Campo de busca por título da trilha e do vídeo.
- Filtro de status: Todas / Em andamento / Concluídas / Não iniciadas.
- Filtro de audiência (Parceiro/Cliente) apenas na tela interna, onde as duas convivem; nas áreas de parceiro e cliente a audiência já é fixa.
- Contador de resultados e aviso quando nada corresponde.

## Detalhes técnicos

- Migração aditiva: `elora_dashboard_widgets` ganha `layout jsonb` (`{x,y,w,h}`, default `{}`); nova tabela `elora_dashboard_modelos` (id, nome, descricao, widgets jsonb, criado_por, timestamps) com GRANT antes de RLS — leitura/escrita apenas `is_equipe_interna()`, nada para `anon`. `ordem` permanece como desempate e fallback de empilhamento.
- Grade própria em `src/components/dashboard-grid.tsx` (pointer events + CSS grid), sem nova dependência: colisão, empurra-para-baixo e compactação em um helper puro `src/lib/grid-layout.ts` coberto por testes.
- `src/lib/dashboard-widgets.functions.ts`: `salvarWidgetCliente` aceita `layout`; novas funções `listarModelosPainel`, `salvarModeloPainel`, `salvarPainelComoModelo`, `excluirModeloPainel`, `aplicarModeloEmClientes({ modeloId, clienteIds })` — todas com `requireSupabaseAuth` + `exigirEquipeInterna`, validando referências por cliente antes de gravar.
- `src/components/widget-builder.tsx`: grade no lugar das setas, campo `formato` (`inteiro` | `moeda`) no bloco métrico; `src/components/resultados-cliente.tsx` renderiza a grade e formata com `formatBRL`.
- Nova rota `src/routes/ver-como.tsx` com os dois seletores, navegando para `/parceiro?como=` e `/area-do-cliente?como=`; item no `defaultGestaoItems` de `src/components/app-sidebar.tsx`.
- Filtros do Treinamento na camada de UI (`painel-treinamento.tsx` e `src/routes/treinamento.tsx`), aplicados sobre os dados já carregados.
- Tipos do banco regenerados.

## Validação

- Mover e redimensionar widgets, recarregar e conferir que a grade persiste; conferir empilhamento em coluna única no celular.
- Bloco métrico em "Inteiro" e em "Valor financeiro" lado a lado.
- Salvar painel como modelo, aplicar em outro cliente que já tinha widgets, confirmar substituição e independência após editar o modelo.
- Aplicar o mesmo modelo em 3 clientes selecionados em massa.
- "Ver como parceiro" e "Ver como cliente" direto pelo menu lateral.
- Busca e filtros do Treinamento nas três telas.
- Celular, tablet e computador, temas claro e escuro; testes existentes mais os novos de grade.
