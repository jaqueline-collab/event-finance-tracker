# Aprovação: primeira leva visual + simplificação de fluxos (itens 3)

## Leva visual (baixo risco, sem mexer em lógica)

1. **Página 404 e tela de erro grave**: traduzir para português ("Página não encontrada" / "Voltar ao início", e o equivalente para "This page didn't load"), aplicando o visual Elora nas duas.
2. **Área do Cliente no celular**: corrigir a tabela de campanhas que está deixando a página mais larga que a tela e balançando pro lado — sem remover nenhuma coluna de dado, só corrigir o comportamento de rolagem/largura.
3. **Financeiro no celular**: ajustar os botões "Importar fechamentos" e "Novo lançamento" para caberem na tela sem sair da borda.
4. **Cores fora da paleta Elora**: trocar o azul-claro genérico dos selos de "Trial"/"Downgrade" em Clientes, o azul-claro do selo em Resumo, o azul/âmbar/verde de fábrica dos estágios de Orçamentos, e o âmbar genérico da faixa "vendo como" na Área do Parceiro — todos para as cores da identidade Elora (preto/escuro + amarelo de destaque).

## Simplificação de fluxos (mexe em navegação, aprovado)

5. **Registrar movimento**: adicionar um atalho direto na linha de cada cliente na lista de Clientes, sem precisar abrir a ficha primeiro.
6. **Anexar NF**: trocar o fluxo de "marcar caixas → botão aparece" por um botão de anexar já disponível por fechamento, direto.
7. **Trocar de cliente no Meu Dash**: adicionar um seletor de cliente no topo da tela, sem precisar voltar pra lista.
8. **Ver como**: substituir a página intermediária por uma busca direta no próprio menu lateral.

## O que não está incluso nesta rodada

- Cantos arredondados misturados, títulos sem padrão único, e unificação dos cartões de indicador — ficam pra próxima leva visual, depois de validar essa primeira.
- Tabelas de Clientes e do Parceiro com colunas ocultáveis no celular — mesma coisa, próxima leva.
- Demais abas da Área do Parceiro e comparação claro/escuro completa — ainda pendentes de conferência, tratar depois.

## Validação

- Os 52 testes automatizados continuam passando depois de cada mudança (nenhum toca em lógica de cálculo/regra).
- 404 e erro de servidor em português, com visual Elora, testados diretamente forçando cada erro.
- Área do Cliente e Financeiro conferidos em 390px, sem estouro de largura.
- Cada cor trocada conferida nos dois temas (claro e escuro).
- Cada fluxo simplificado (5 a 8) testado de ponta a ponta: o atalho funciona e continua levando ao mesmo resultado de antes, só com menos passos.