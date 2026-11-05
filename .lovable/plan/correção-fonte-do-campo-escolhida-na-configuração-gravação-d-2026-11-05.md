# Correção: fonte do campo escolhida na configuração + gravação do relatório

## 1. Campo sempre com fonte
- Em `elora_indicadores_config`, cada evento e cada condição guarda o campo como `{fonte: 'card'|'contato'|'atendimento'|'utm', campo: ...}`.
- Nada no código decide de onde vem "Data da consulta" ou qualquer outro campo; o motor lê a fonte gravada.
- Configurações antigas sem fonte: tratadas como erro de configuração visível na tela de validação (sem adivinhar).

## 2. Catálogo de campos agrupado
- Grupos: Campos do card, Campos do contato, Atendimento, UTM.
- Mesmo nome pode aparecer em dois grupos (ex.: "Data da consulta" no card e no contato); a pessoa escolhe qual.

## 3. Contato ligado ao card
- Campo de contato em indicador de card usa o contato ligado ao card.
- Card com mais de um contato: usa o primeiro. A configuração mostra isso por escrito ("usa o primeiro contato do card") e guarda `contato_do_card: 'primeiro'`.

## 4. Seed do 8c0ojhr2
- Consulta Agendada e Procedimento Vendido passam a usar fonte "card" (campos personalizados do card). Só o valor do seed, editável sem código.

## 5. Recalcular e mostrar (sem gravar)
- Consulta Agendada e Procedimento Vendido dos últimos 30 dias, por dia, com marca de estimado.
- Contagem de cards hoje em Agendados com "Data da consulta" e "Data do Procedimento" preenchidos, separado por fonte (card x contato) para comparação.

## 6. Testes
- Dois clientes com a mesma regra, um apontando para o card e outro para o contato, dão resultados diferentes.
- Card com dois contatos usa o primeiro.
- Condição sem fonte não conta.

## 7. Gravação no relatório diário (só depois de você ver o item 5)
- Antes: tabela de backup `elora_relatorio_diario_backup` com os valores atuais do n8n de 25 e 26/09 (linha completa + data do backup), para poder voltar.
- Depois: grava as colunas padrão de 22/09 a 03/10 (substitui 25 e 26/09, preenche os outros 10) com os valores validados contra o monday.
- Nada apagado; nada publicado.

## Ordem
1. Itens 1 a 6, mostrar resultado e parar.
2. Após seu ok, item 7, mostrar e parar.
