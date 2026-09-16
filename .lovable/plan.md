# Ajustes de layout na Área do Cliente

## Objetivo
Reorganizar apenas a apresentação e a navegação da Área do Cliente, preservando integralmente dados, cálculos e conteúdo do painel de resultados.

## Alterações

1. **Cabeçalho principal**
   - Incluir `Dash` antes de `Conta`, `Novidades` e `Minha equipe`.
   - Fazer `Dash` selecionar a visão de resultados, que continuará sendo a visão inicial da página.
   - Mover `Acessar o aplicativo` para essa mesma área do cabeçalho, mantendo a abertura do aplicativo em nova aba.
   - Ajustar a distribuição dos itens para caber sem sobreposição no celular, tablet e computador.

2. **Bloco de identificação do cliente**
   - Remover dali o botão `Acessar o aplicativo`.
   - Exibir no espaço liberado `Olá, [primeiro nome]`, alinhado à altura do nome do cliente.
   - Obter o nome exclusivamente do perfil da sessão autenticada; no modo “Ver como cliente”, a saudação continuará mostrando a administradora conectada, nunca o cliente visualizado.
   - Usar apenas o primeiro nome do perfil; se o perfil ainda não tiver nome, usar a parte anterior ao `@` do e-mail da própria sessão como alternativa.
   - Manter sem alterações o selo de status, o nome do cliente, a data de ativação e o plano.

3. **Navegação do painel**
   - Remover a pílula isolada `Resultados` da área abaixo do bloco do cliente.
   - Manter o conteúdo atual de resultados associado à aba interna `resultados`, agora acionada por `Dash` no cabeçalho.
   - Não alterar os quatro blocos, tempos médios, gráficos, contatos, ranking, filtros, consultas ou cálculos.

## Validação
- Conferir que `Dash` abre primeiro e retorna aos resultados a partir de `Conta`, `Novidades` e `Minha equipe`.
- Conferir a saudação com login de cliente e com administradora em “Ver como cliente”.
- Comparar o painel antes/depois para garantir que somente a navegação e o posicionamento mudaram.
- Testar em celular, tablet e computador, nos temas claro e escuro, verificando que cabeçalho, saudação e controles não se sobrepõem nem provocam rolagem horizontal.
- Confirmar testes existentes e compilação sem erros.

## Detalhes técnicos
- A página continuará usando o estado de abas atual; apenas o controle de `resultados` será movido para o portal do cabeçalho com o rótulo `Dash`.
- A saudação usará o perfil autenticado já fornecido pelo fluxo de sessão, sem consultar nem reutilizar o nome do cliente retornado pelo modo de visualização.
- Nenhuma alteração de banco de dados, autorização, integração ou função de resultados será feita.
