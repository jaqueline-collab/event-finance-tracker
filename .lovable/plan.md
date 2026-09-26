# Melhorias na tela Financeiro (Lançamentos)

Não muda nenhum cálculo de fechamento e não apaga nenhum dado. Tudo o que for renomear só muda o que aparece na tela, não o que está gravado.

Decisão confirmada: o selo "Anexada" passa a depender só de existir um arquivo de NF anexado.

## 1. Tirar a chave de NF
- Sai da lista a chave (toggle) de NF marcada à mão.
- O selo "Anexada" aparece sozinho quando o lançamento tem um arquivo de NF anexado pelo botão de upload. Se não tiver arquivo, não aparece selo.
- Também sai a chave "NF emitida" da janela de novo lançamento e de edição.
- O cartão "NF a emitir" passa a contar os fechamentos que ainda não têm arquivo anexado.

## 2. "Pago" vira "Recebido", em verde
- Só nesta tela: o rótulo "Pago" vira "Recebido" (no seletor, no selo, no filtro e nos textos dos cartões de receita).
- O selo "Recebido" fica verde. Os outros status continuam com as cores de hoje.
- O valor gravado continua o mesmo, então nada muda nas outras telas nem nos relatórios.

## 3. Descrição igual à do Fechamento Mensal
- A linha passa a mostrar "Nome do parceiro ou cliente · Mês/Ano" (ex.: "Rabbit Agency · Agosto/2026"), o mesmo nome usado em Fechamento Mensal.
- O nome vem do fechamento ligado ao lançamento. O ciclo aparece em texto menor, logo abaixo.
- Lançamentos antigos ou manuais sem fechamento ligado continuam mostrando a descrição que já têm.

## 4. Coluna "Tipo" mostra "Receita"
- O selo da coluna mostra "Receita" no lugar de "Fechamento" e "Despesa" no lugar de "Custo".
- O texto repetido abaixo da descrição sai. O filtro de tipo usa os mesmos nomes.

## 5. Trocar o arquivo da NF
- Nos lançamentos que já têm NF, aparece o botão "Substituir" ao lado do selo "Anexada".
- Ele abre a mesma janela de envio. O arquivo novo fica no lugar do antigo: o arquivo antigo vai para a lixeira do Drive e o registro da nota é atualizado, sem criar uma nota repetida.
- Se a nota cobre vários lançamentos, a troca vale para todos eles. A janela avisa isso antes de você confirmar.
- Só a equipe interna pode trocar. O parceiro passa a baixar sempre o arquivo novo.

## Validação
- A lista não tem mais a chave de NF. Anexar um arquivo marca "Anexada" sozinho.
- "Recebido" aparece em verde. A coluna Tipo mostra "Receita".
- A descrição bate com o nome do Fechamento Mensal para o mesmo parceiro e mês.
- Depois de substituir, baixar a nota (pela equipe e pela Área do Parceiro) entrega o arquivo novo.
- Conferir no celular, tablet e computador, nos temas claro e escuro. Os testes atuais continuam passando.

## Detalhes técnicos
- `src/routes/financeiro.tsx`: remover o `Switch` de `nf_emitida` da linha e do formulário. O selo usa `listarVinculosNotas` (`porLancamento[l.id]`). `STATUS` pago recebe `label: "Recebido"` e cor verde via token (ex.: `bg-success/15 text-success`; adicionar `--success` em `src/styles.css` nos dois temas se ainda não existir). A descrição é montada na exibição a partir de `elora_fechamento_itens` (lancamento_financeiro_id → cliente → parceiro) + competência.
- `nf_emitida` continua no banco sem alteração (não é apagado). O cartão "NF a emitir" passa a usar os vínculos.
- `src/lib/notas-fiscais.functions.ts`: nova `substituirNotaFiscal({ notaId, nomeArquivo, mimeType, conteudoBase64 })` com `requireSupabaseAuth` + `is_equipe_interna()`. Envia o arquivo novo para a mesma `drive_folder_id`, dá `UPDATE` em `elora_notas_fiscais` (drive_file_id, nome_arquivo, mime_type) e manda o arquivo antigo para a lixeira do Drive (`trashed: true`, sem apagar de vez). Não precisa mudar o banco.
