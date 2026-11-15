# Alinhamento das tabelas, colunas preenchidas à mão, as +459 conversas e a visão Resultados (novo)

Nenhum cálculo muda. Vou tirar o retrato dos números antes e depois de cada parte, parar se algum número mudar e não publicar.

## 0. Explicação das +459 conversas (já conferido)

Os +459 estão todos nos dias de 05/11 a 12/11. A soma exata, dia a dia, no Resultados:

| Dia | Antes | Depois | Diferença |
|---|---|---|---|
| 05/11 | 119 | 121 | +2 |
| 06/11 | 96 | 99 | +3 |
| 07/11 | 37 | 39 | +2 |
| 08/11 | 12 | 14 | +2 |
| 09/11 | 0 | 90 | +90 |
| 10/11 | 0 | **248** | **+248** |
| 11/11 | 0 | 61 | +61 |
| 12/11 | 0 | 51 | +51 |
| Total | 2.326 | 2.785 | **+459** |

Na minha tabela anterior, o dia 10/11 veio do Relatório diário, que mostra **140**, e não do Resultados, que mostra **248**. Os 108 que faltam (248 − 140) estão todos nesse dia. Em todos os outros dias, os dois mostram o mesmo número.

Isso quebra a regra "Painel e Relatório diário dão o mesmo número". A causa ainda não está confirmada, então a investigação vem primeiro:
- Listar os atendimentos de 10/11 que o Resultados conta e o Relatório diário não. No banco há 317 atendimentos criados nesse dia.
- Mostrar um exemplo real e dizer qual dos dois números está certo, por exemplo uma conversa que começou num dia e teve a primeira mensagem em outro.
- Nesta entrega: só investigar, mostrar o exemplo real e qual número está certo. Nenhuma correção antes da sua aprovação.

## 1. Resultados (novo)

- Não será recriada.
- Toda exclusão de visão passa a ficar registrada (quem, quando, conteúdo), com desfazer para a super admin.
- Proteção: ao salvar as abas, nenhuma visão some sem exclusão explícita pelo "Excluir".

## 2. Alinhamento das tabelas

- **Regra única para toda tabela atual ou futura:**
  - Colunas de número: título e valores centralizados, com números tabulares para alinhar os dígitos.
  - Colunas de texto e a coluna Dia: à esquerda.
- **Onde vale:** Relatório diário, tabela de itens e tabelas agregadas do Resultados.

## 3. Colunas preenchidas à mão (ex.: Social Selling)

**Para quem pode preencher:**
- A célula sempre tem aparência de campo: borda sutil, fundo claro e número centralizado.
- Ao passar o mouse, aparece um lápis pequeno. Vazia, mostra o campo vazio, sem dica.
- **Editar:** clicar, tocar, Tab ou Enter edita no lugar. Enter ou sair do campo salva, Esc cancela.
- **Formato:** aceita só números, conforme o formato da coluna (inteiro, decimal ou moeda). Se for inválido, mostra uma mensagem clara.
- **Ao salvar:** aparece "Salvo" discreto na célula, ou o erro visível, sem recarregar a página.
- **No celular:** abre o teclado numérico.

**Para quem não pode:** só o número, sem aparência de campo. O título da coluna mostra um lápis pequeno para indicar que é preenchida à mão.

**Configuração da coluna (super admin):**
- Quem preenche: cliente, parceiro ou só super admin.
- Se aceita dias futuros. O padrão é só hoje e dias passados.
- O servidor confere essa regra a cada gravação.

**Registro de alterações:**
- Cada alteração guarda quem alterou, quando, o valor anterior e o novo.
- A super admin vê o histórico e pode desfazer.

**Vazio não é zero:** zero digitado aparece 0; vazio fica em branco e não conta como zero nos totais.

**Uso do valor:** entra nos totais, no Exportar, na Elora IA e nos filtros como qualquer coluna. Isso já acontece hoje e vou confirmar com testes.

## 4. Canais (Configuração > Canais)

Hoje há 7 canais nos atendimentos do Dr. Ricardo e a tela mostra 5. Falta o Instagram @dr.ricardoassumpcao (320 atendimentos) e um WhatsApp com 4.

- **Lista completa:** a lista inclui todos os canais que aparecem nos atendimentos, mesmo os que a busca da conta não retorna.
- **Nome real em vez do código**, vindo do Elora:
  - WhatsApp: "Instância ...".
  - Instagram: o @ da conta.
  - Messenger: o nome da página.
- **Apelido:** quando existir, continua tendo prioridade.
- **Tipo:** o selo "Outro" vira o tipo real (WhatsApp, Instagram, Messenger). Os filtros mostram só os tipos que existem.
- **Telefone:** no formato (55) 31 99864-6532.
- **Mesma regra em todo o painel:** o nome do canal segue essa regra em todas as telas, tabelas, filtros e no Exportar. Antes de gravar, mostro o retrato dos números, porque agrupamentos que hoje juntam canais em "Canal sem nome" passam a separá-los. Os totais não mudam.

## 5. Limpeza do antigo (duas etapas)

**Etapa 1, só levantamento, sem apagar nada.** Para cada item: o que é, o tamanho, se alguma tela, cálculo ou rotina ainda lê aquilo, e a marca "seguro apagar", "ainda em uso" ou "precisa de decisão". Itens a levantar, no mínimo:
- Histórico do relatório antigo: registros da automação e congelamentos, a tela e o código.
- O botão "Comparar com gravado".
- O seletor antigo.
- A sincronização seletiva antiga (`elora_contatos_sincronizados`).
- As leituras estimadas de histórico de cards.
- Caches e versões que não são mais lidos.
- Código e tabelas sem uso.
- Marcas de migração já concluídas (kpisMigrados e semelhantes).
- Retratos e arquivos de teste temporários.

**Etapa 2, só após a sua aprovação do levantamento:**
- Exportar um backup em Files de tudo o que for apagado.
- Apagar só o que você aprovar.
- Rodar os testes e mostrar o retrato antes e depois, com zero diferenças.
- Manter o registro de ações com desfazer e tudo o que a auditoria precise.

## 6. Colunas da tabela (editor do bloco e botão "Colunas")

- **Status do lead como coluna normal:** vira uma linha comum da lista, que se marca, desmarca, fixa, remove e posiciona em qualquer lugar. Sai a seção separada "Coluna Status do lead".
- **Engrenagem na linha:** a configuração do status (contato ou card, funil, campo, cores das etapas) abre por uma engrenagem na própria linha.
- **Arrastar para reordenar:** cada linha ganha uma alça (⋮⋮). As setas de subir e descer continuam como alternativa pelo teclado. Vale para todas as colunas.
- **Onde a ordem vale:** na tabela, no Exportar e no Agrupar por. O Status do lead exporta o nome do status, nunca o código.
- **Teste:** mover o Status do lead para a 2ª posição e para o fim, fixar à esquerda, recarregar e conferir que a ordem ficou gravada.

## 7. Tamanho dos blocos

**Causa confirmada:** a tabela do Relatório diário foi gravada como um bloco do tipo "número". Esse tipo tem largura máxima de 6 colunas (metade) e altura máxima de 2, então ela não estica. Além disso, as alças de redimensionar só aparecem ao passar o mouse e quase não se veem.

**Correção:**
- **Tipo próprio para a tabela:** a tabela do Relatório diário ganha um tipo de bloco só dela, de largura 1 a 12 e altura livre, que abre em largura inteira. A largura mínima de cada tipo de bloco continua igual.
- **Alças visíveis** em modo Editar nas bordas direita e inferior e no canto, com o cursor mudando ao passar por cima. Vale para todos os blocos, em todas as visões.
- **Largura pelo menu do bloco:** Metade, Dois terços ou Largura inteira.
- **Gravação:** o tamanho fica gravado e volta igual depois de recarregar.
- **No celular (390):** o bloco ocupa a largura inteira e o redimensionar fica oculto, sem botão desativado.
- **Teste:** esticar a tabela do Relatório diário até a largura inteira, salvar, recarregar e conferir.

## 8. "Comparar com gravado"

O botão ainda aparece na barra do Relatório diário e entra no levantamento da limpeza (item 5).

## Conferência

- **Testes, um por regra:**
  - Alinhamento.
  - Formato do número aceito.
  - Quem pode preencher.
  - Dia futuro bloqueado por padrão.
  - Registro com valor anterior e novo.
  - Desfazer.
  - Valor presente no total e no Exportar.
- **Números:** retrato antes e depois, com zero diferenças.
- **Telas:** conferência em 390, 834 e 1440 de largura, nos temas claro e escuro.
- Não publicar.

## Detalhes técnicos

- **Alinhamento:** regra única de alinhamento por tipo de coluna (`numero` = centro + `tabular-nums`, demais à esquerda), aplicada no cabeçalho e nas células da Matriz, de `TabelaItens` e das tabelas agregadas. Assim, toda tabela nova herda a regra.
- **Permissões da coluna manual:** novos campos na própria linha da coluna em `elora_indicadores_config`, com quem preenche (`cliente | parceiro | super_admin`) e se aceita dia futuro. `salvarCelulaManual` passa a validar o papel de quem chama, a data e o formato no servidor, em vez de aceitar só super admin.
- **Registro:** nova tabela de histórico das células manuais, acessível só pelo servidor, com valor anterior, valor novo, quem e quando. A função de desfazer é só para super admin. O cache se renova sozinho, porque `elora_matriz_manual` já entra na versão do cálculo.
- **Célula editável:** componente próprio com `inputMode="decimal"` ou `"numeric"` e atualização imediata da tela, revertida se der erro. O "Salvo" fica visível por cerca de 2 s.
- **Exclusão de visões:** `salvarVisoesCliente` passa a registrar cada exclusão em `elora_config_acoes`, com o conteúdo, e só exclui ids vindos de uma lista explícita `excluir`.
- **Canais:** `lerMapaCanais` completa a lista com os pares `canal_id`/`canal_nome` distintos dos atendimentos, por função SQL, sem trazer linhas. Tipo e nome real saem do payload do canal (`identity`/`type`). O apelido continua em `elora_dados_canais_permitidos`. `nome-canal.ts` segue como regra única.
- **Tamanho:** novo tipo `tabela_matriz` em `layout-blocos.ts` (largura de 1 a 12 e altura livre), que nunca é enviado ao cálculo. Os blocos já gravados são convertidos na leitura (`cartoesDaMatriz`). O menu de largura usa o mesmo `redimensionar`.
- **Colunas:** o editor de colunas e a `BarraTabela` usam uma lista só, ordenável por arrastar com dnd-kit, onde o Status do lead é mais uma entrada com engrenagem que abre o `ConfigStatusLead`.
- **Limpeza:** o levantamento usa busca no código (quem importa o quê), tamanho das tabelas e leituras registradas. Cada exclusão de tabela passa por uma migração separada, depois do backup.
