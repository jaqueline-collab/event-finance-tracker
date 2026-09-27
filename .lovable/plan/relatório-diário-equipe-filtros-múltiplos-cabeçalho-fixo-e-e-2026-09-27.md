# Relatório diário: Equipe, filtros múltiplos, cabeçalho fixo e exportação

Só a aba "Relatório diário" muda. A aba "Dash" continua com seus atalhos de 7 e 30 dias.

## O que muda

1. **Gravação (rota registrar)**: nova informação opcional `equipe` em cada linha, que funciona como canal e atendente (se vier vazia ou não vier, fica ''). A regra que evita linhas repetidas passa a usar cliente, data, canal, atendente e equipe.
2. **Leitura**: o relatório passa a trazer `equipe` junto com cada linha.
3. **Período**: saem os atalhos "Últimos 7 dias" e "Últimos 30 dias". Ficam só Data inicial e Data final. Ao abrir, o período padrão continua sendo os últimos 30 dias, já preenchidos nos campos.
4. **Cabeçalho e Total fixos**: a tabela ganha uma área de rolagem com altura limitada (cerca de 70% da tela). Ao rolar, os nomes das colunas e a linha Total continuam visíveis no topo. A rolagem para os lados continua funcionando no celular.
5. **Canal e Atendente com escolha múltipla**: cada filtro vira um botão que abre uma lista com caixas de marcar. Dá para marcar vários valores. "Todos" limpa a seleção, e sem nenhuma seleção nada é filtrado. Valor vazio aparece como "Não informado". O botão mostra "Todos", o nome escolhido ou, por exemplo, "3 selecionados".
6. **Novo filtro Equipe**: funciona igual aos filtros de Canal e Atendente. A coluna "Equipe" também entra na tabela e no botão "Colunas".
7. **Botão Exportar**: abre um menu com CSV, XLSX e PDF. O arquivo sai com as linhas filtradas, as colunas visíveis e a linha Total. O nome do arquivo leva o cliente e o período.

## Validação

- Enviar à rota uma lista com equipes diferentes no mesmo dia para um cliente de teste. Devem ser gravadas linhas separadas, e reenviar deve atualizar sem duplicar. Depois, apagar essas linhas.
- Abrir a Área do Cliente do Dr. Ricardo (pelo "Ver como") com dados reais. Conferir o período, os três filtros com mais de um valor marcado, "Não informado", o Total, o cabeçalho fixo ao rolar e os três arquivos exportados, abrindo cada um.
- Conferir no celular (390), no tablet (834) e no computador (1440), com temas claro e escuro.

## Detalhes técnicos

- `registrar.ts`: `equipe: z.string().max(200).nullable().optional()` e `equipe: d.equipe ?? ""`; `onConflict: "cliente_id,data,canal,atendente,equipe"`. Antes, conferir no banco se a coluna `equipe` e a nova regra de linha única já existem.
- `integracao-elora.functions.ts`: `equipe: string` em `RelatorioDiarioLinha` e no select/mapeamento de `getRelatorioDiarioCliente`.
- `resultados-cliente.tsx`: filtros como `string[]` com o valor especial `nao_informado`; componente `FiltroMultiplo` feito com Popover e Checkbox; container `max-h-[70vh] overflow-auto`, `thead` com `sticky top-0` e linha Total com sticky logo abaixo do cabeçalho, em `bg-card`.
- Exportação no navegador com as bibliotecas que o app já usa: `xlsx` para XLSX, CSV com BOM UTF-8 e separador `;`, e `jspdf` + `jspdf-autotable` em paisagem para PDF.
