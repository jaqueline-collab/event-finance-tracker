# Corrigir atalhos no topo da Área do Parceiro

## Resultado esperado

Na página `/parceiro`, os atalhos **Site**, **Elora App** e **Treinamento** deixam de aparecer dentro do conteúdo da página.

Eles passam para o topo global, na mesma linha de:

- alternar modo claro/escuro;
- notificações;
- foto/menu do usuário.

A ordem será: identificação “Elora · Área do parceiro”, atalhos do parceiro, tema, notificações e perfil.

## Comportamento

- **Site** continua usando o endereço real cadastrado para o parceiro.
- **Elora App** continua abrindo o login real do aplicativo.
- **Treinamento** mantém o aviso de página em construção.
- No modo administrativo “Visualizar como parceiro”, os atalhos usam os dados do parceiro selecionado.
- A faixa amarela de visualização administrativa permanece abaixo do topo, como na referência enviada.
- Os menus **Clientes**, **Financeiro** e **Calculadora** permanecem ao lado do nome do parceiro.
- Em telas menores, os atalhos serão compactados sem sobrepor tema, sino ou foto.

## Implementação técnica

- Criar um espaço de ações específicas no cabeçalho compartilhado do painel.
- A rota da Área do Parceiro fornecerá os três atalhos e o endereço do site ao cabeçalho.
- Remover a linha duplicada “Elora Parceiros” e os atalhos do conteúdo da página.
- Limpar as ações ao sair da Área do Parceiro para que não apareçam em outras páginas.

## Validação

- Conferir o posicionamento em celular, tablet e computador.
- Confirmar que os três atalhos ficam acima da faixa amarela.
- Confirmar que Site, Elora App e Treinamento mantêm os destinos e comportamentos atuais.
- Confirmar que outras páginas do painel não recebem esses atalhos.
- Verificar ausência de sobreposição e rolagem horizontal.
