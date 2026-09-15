# Área do Parceiro — navegação superior, LTV em dias, gráfico claro e calculadora

## Resultado esperado

A área do parceiro deixa de ter a barra lateral. O topo passa a ser organizado em duas linhas compactas:

1. **Elora Parceiros** à esquerda e, na mesma linha, os atalhos **Site**, **Elora App** e **Treinamento**.
2. Logo abaixo, o nome do parceiro — por exemplo, **Rabbit Agency** — com os menus **Clientes**, **Financeiro** e **Calculadora** ao lado.

O menu **Financeiro** continua aparecendo somente quando o controle administrativo “Pode ver fechamentos” estiver ligado. A Calculadora fica disponível ao parceiro para montar propostas usando exclusivamente os planos comerciais vinculados a ele.

## Ajustes na página Clientes

- Remover completamente a navegação lateral e deixar o conteúdo ocupar toda a largura disponível.
- Manter busca, período, status, resumos, tabela e histórico já existentes.
- Corrigir **LTV média** e **LTV mediana** para representarem tempo de vida em dias, nunca dinheiro:
  - início: `data_inicio`/setup do cliente;
  - fim: hoje, se ainda ativo;
  - fim: `data_churn`, se cancelado;
  - exibição: por exemplo, `128 dias`.
- O LTV deixa de depender do controle de visualização de valores, pois datas e duração não são valores financeiros.

## Gráfico de entradas e saídas

Reformular o gráfico com a legibilidade do bloco “Evolução nos últimos 12 meses” do painel interno:

- superfície e grade compatíveis com tema claro e escuro;
- eixos e textos usando as cores semânticas legíveis do painel;
- tooltip com fundo, borda e texto próprios do tema;
- barra de **Entradas verde**;
- barra de **Saídas vermelha**;
- legenda clara e altura estável em celular, tablet e computador;
- manter o período escolhido nos filtros e as contagens atuais, sem alterar dados.

## Nova aba Calculadora

Adicionar **Calculadora** ao menu da área do parceiro, sem criar ou alterar clientes, movimentos, fechamentos ou lançamentos.

Fluxo:

1. Carregar no servidor somente os planos cujo `parceiro_ids` contém o parceiro autenticado — no modo admin “ver como”, somente os planos do parceiro selecionado.
2. Permitir escolher um desses planos e informar a configuração da venda: usuários, contatos, canais WhatsApp, Instagram e Messenger, Z-API, agentes de IA, ASAAS, transcrição e acompanhamento.
3. Mostrar em tempo real:
   - valor de setup do plano;
   - mensalidade base;
   - franquias incluídas;
   - excedentes e opcionais cobrados;
   - acompanhamento informado;
   - total mensal estimado;
   - composição detalhada da proposta.
4. Reutilizar a mesma regra oficial de cálculo comercial já usada nos clientes (`explicarReceitaCliente` / `receitaMensalCliente`), com um cliente simulado, evitando uma segunda fórmula divergente.
5. Não exibir nem devolver custos internos, custo WTS, licença base, preços de custo, margem, lucro ou desconto de escala.
6. Se nenhum plano estiver vinculado, mostrar uma mensagem clara em vez de oferecer valores genéricos.

A consulta será protegida pela função autenticada da área do parceiro e fará projeção por lista branca. O front-end não receberá os campos de custo do plano.

## Segurança e dados

- O modo “ver como parceiro” continua restrito à equipe interna e somente leitura.
- A aba Calculadora resolve o parceiro no servidor pelo login, ou pelo parceiro escolhido no modo administrativo já existente.
- A validação de vínculo do plano acontece no servidor; alterar parâmetros na tela não libera outro plano.
- Nenhuma migração ou alteração de dados existentes é necessária.
- Nenhum orçamento será salvo nesta etapa: a calculadora é somente uma simulação comercial.

## Validação

- Conferir que não existe mais barra lateral e que as duas linhas do topo seguem a organização solicitada.
- Validar menus e atalhos em celular, tablet e computador, sem sobreposição ou largura excedente.
- Confirmar LTV de um cliente ativo e um cancelado pela diferença real de dias.
- Confirmar Entradas em verde, Saídas em vermelho e tooltip legível nos dois temas.
- No modo “ver como Rabbit Agency”, confirmar que a Calculadora oferece somente **Essencial Rabbit Agency** e que o total bate com a regra oficial do plano.
- Tentar solicitar outro plano diretamente e confirmar recusa/ausência no retorno.
- Buscar no payload da calculadora e confirmar ausência de custo, WTS, margem, lucro, licença base e preços internos.
- Rodar testes automatizados relevantes, verificação de tipos e conferir a tela renderizada nos três tamanhos.
