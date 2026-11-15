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
- Só corrigir depois da sua aprovação, mostrando a tabela antes e depois. Esta é a única mudança de número possível nesta entrega.

## 1. Resultados (novo)

- **Não achei ação automática do sistema que apague visões.** A visão só é apagada quando a super admin salva as abas sem ela, por exemplo pelo "Excluir" ou ao salvar uma lista de abas sem essa visão. Essa exclusão hoje não deixa registro. A visão existia às 17:20 e não existia mais às 17:50. Nesse intervalo entrou a mudança que tornou o Relatório diário uma aba móvel, então vou conferir se ela pode ter tirado a visão do rascunho ao salvar.
- **Recriar como rascunho** com o mesmo conteúdo do registro de 13/11 02:33 (visão 20cd3412): mesmos blocos, filtros e nome, não publicada.
- **Daqui em diante:** apagar uma visão passa a ficar registrado, com quem, quando e o conteúdo, e a super admin pode desfazer.
- Colocar uma proteção: ao salvar, uma visão só some se tiver sido excluída de propósito pelo "Excluir".

## 2. Alinhamento das tabelas

- **Regra única para toda tabela atual ou futura:**
  - Colunas de número: título e valores centralizados, com números tabulares para alinhar os dígitos.
  - Colunas de texto e a coluna Dia: à esquerda.
- **Onde vale:** Relatório diário, tabela de itens e tabelas agregadas do Resultados.

## 3. Colunas preenchidas à mão (ex.: Social Selling)

**Para quem pode preencher:**
- A célula sempre tem aparência de campo: borda sutil, fundo claro e número centralizado.
- Ao passar o mouse, aparece um lápis pequeno. Vazia, mostra "0" suave como dica.
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

**Uso do valor:** entra nos totais, no Exportar, na Elora IA e nos filtros como qualquer coluna. Isso já acontece hoje e vou confirmar com testes.

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
- **Exclusão de visões:** `salvarVisoesCliente` passa a registrar cada exclusão em `elora_config_acoes`, com o conteúdo, e só exclui ids vindos de uma lista explícita `excluir`. A recriação usa o `depois` do registro `723f95b3`.
