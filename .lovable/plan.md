# Etapa 2 do novo visual: Área Financeira única + Parceiro e Cliente no novo padrão

Nada muda em valores, fechamentos, movimentos, lançamentos ou permissões. A mudança é só de organização e visual.

## Ordem de execução

- **Parte 1**: o Financeiro único, com testes e a conferência dos totais. Paro e te mostro o resultado.
- **Parte 2**: as Áreas do Parceiro e do Cliente, só depois que você aprovar a Parte 1.

## 1. Área Financeira única (equipe interna)

Uma tela **Financeiro** com três abas no topo:

- **Fechamento mensal**: o conteúdo atual de Resumo/Fechamento, igual ao de hoje (gerar, congelar, PDFs, auditoria).
- **Lançamentos**: o Financeiro atual (receitas, despesas, status Recebido).
- **Notas fiscais**: anexar, substituir e baixar notas, com as mesmas regras de hoje.

Como funciona:
- A aba aberta aparece no endereço (`/financeiro?aba=fechamento`), então dá para voltar, recarregar e compartilhar o link.
- Os endereços antigos continuam funcionando: `/resumo` leva para a aba Fechamento.
- No menu lateral, o grupo Financeiro passa a ter um único item, "Financeiro", no lugar de três.
- Cada aba confere a permissão do seu módulo: Fechamento mensal usa a permissão "Fechamento Mensal"; Lançamentos e Notas fiscais usam a permissão "Financeiro". Abas sem permissão ficam escondidas.
- A tela abre na primeira aba que a pessoa pode ver. Um link para uma aba sem permissão leva para a primeira aba permitida. Sem nenhuma aba permitida, aparece um aviso de "sem acesso" em vez de uma tela vazia.

## 2. Área do Parceiro no novo padrão

- O cabeçalho com muitos botões vira um menu lateral em grupos, no mesmo estilo da área interna:
  - **Monitorar**: Clientes
  - **Financeiro**: Fechamentos (com auditoria e comparação), Notas fiscais e Calculadora
  - **Recursos**: Site, Elora App, Treinamento e Apresentar ferramenta
- No celular, o menu vira uma gaveta.
- Continuam funcionando o "Ver como" e os endereços que abrem cada seção.
- Cards, tabelas e cores usam os mesmos tons da área interna, nos temas claro e escuro.
- Continuam valendo as regras de hoje: valores aparecem só para quem tem permissão, e custo, margem, lucro, WTS e desconto de escala nunca são mostrados.

## 3. Área do Cliente no novo padrão

- Menu lateral com Dash, Relatório diário, Conta e Minha equipe (no celular, gaveta).
- Continuam funcionando o "Ver como" e os endereços de cada seção.
- O Relatório diário fica igual: filtros, colunas, congelamento, exportação e Social Seller.
- Mesmos cartões e cores da área interna.

## Verificação

- Abrir cada aba do Financeiro e conferir que totais e listas batem com os de hoje (Rabbit Agency, Setembro/2026: R$ 10.829,19).
- Usar "Ver como" com um parceiro com permissão de valores, um parceiro sem essa permissão e o cliente Dr. Ricardo.
- Testar no celular (390), tablet (834) e computador (1440), nos temas claro e escuro.

## Detalhes técnicos

- `src/routes/financeiro.tsx` vira uma página com abas (`validateSearch` com `aba`). O corpo atual de `resumo.tsx` e o das notas fiscais vão para componentes em `src/components/financeiro/`, sem mudar a lógica. `resumo.tsx` passa a ter só um `beforeLoad` com redirect.
- Um teste cobre a regra de permissão das abas: quais abas aparecem, qual abre primeiro e para onde vai um link sem permissão.
- `app-sidebar.tsx`: os itens são filtrados pelas mesmas permissões de módulo de hoje.
- Parceiro e Cliente usam o `Sidebar` do shadcn, com uma configuração de grupos para cada área. As seções continuam sendo escolhidas pelo endereço (`?secao=`), e o parâmetro do "Ver como" é mantido.
- Sem migração e sem mudança em funções de servidor.

## Fora deste plano

O arquivo enviado ("Etapa 1 do banco por cliente": cofre de tokens criptografado) é outra entrega, com mudanças no banco e um segredo novo. Ele ganha um plano próprio depois deste.
