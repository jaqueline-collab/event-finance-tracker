# Parte 2: novo menu nas Áreas do Parceiro e do Cliente

Só navegação e visual. Nenhum valor, cálculo, permissão ou regra de visibilidade muda. "Ver como" continua igual (parâmetro `como`, modo somente leitura).

## O que o usuário vê

**Área do Parceiro** (`/parceiro`): menu lateral no mesmo estilo do painel interno, no lugar da fileira de botões.
- Monitorar: Clientes
- Financeiro (só aparece se o parceiro pode ver fechamentos): Fechamentos, Relatórios, Notas
- Ferramentas: Calculadora, Treinamento
- Links: Site do parceiro (se houver), Elora App, Apresentar ferramenta (continua com o aviso "em configuração")
- Topo da página: nome do parceiro grande + subtítulo; faixa "Visualização administrativa" quando em "Ver como".

**Área do Cliente** (`/area-do-cliente`): menu lateral com Painel, Treinamento, Novidades e o link "Acessar o aplicativo". A seção aberta passa a ficar no endereço (`?aba=`), como no parceiro.

No celular, o menu abre pelo botão do topo, igual ao painel interno.

## Regra do carregamento (lição do Financeiro)
- Menu lateral e cabeçalho ficam sempre montados; nunca são trocados por "carregando".
- O esqueleto de carregamento aparece só dentro da área de conteúdo, e só até a primeira leitura concluir. Recargas depois disso (ex.: após adicionar pessoa na equipe, troca de aba) mantêm o conteúdo na tela.
- Itens que dependem de permissão (ex.: Financeiro do parceiro) aparecem quando os dados chegam, sem esconder o resto.
- Erro sem dados: aviso dentro do conteúdo com "Tentar de novo", nunca carregando infinito.

## Preservado
- Valores só com `mostrar_valores_cliente`; fechamentos só com `pode_ver_fechamentos`; nada de custo, margem, lucro, WTS ou desconto de escala.
- Endereços e parâmetros atuais (`aba`, `sub`, `periodo`, `indicador`, `como`) continuam válidos.
- Redirecionamento de cliente/parceiro para a própria área continua igual.

## Testes e entrega
- Teste pequeno da regra "esqueleto só antes da primeira leitura" e do item Financeiro só com permissão.
- Conferir na prévia: parceiro via "Ver como" (Rabbit Agency) e cliente via "Ver como", em 390/834/1440, tema claro e escuro, com recarga (F5).
- Publicar e informar os arquivos alterados.

## Detalhes técnicos
- Novo `src/components/area-externa-sidebar.tsx`: menu lateral genérico (grupos, item ativo `bg-brand-soft`, links externos) usando o `Sidebar` existente.
- `src/routes/__root.tsx`: em `/parceiro`, `/area-do-cliente` e `/cliente`, renderizar a sidebar externa no lugar de nenhuma; um "slot" via portal (`#app-area-sidebar`) para cada página preencher seus itens, mantendo o header atual.
- `src/routes/parceiro.tsx`: trocar `menu` e `atalhosTopo` pela sidebar; substituir o `if (carregando || papel.loading) return <Skeleton>` por esqueleto só no bloco de conteúdo, com ref `jaCarregou`.
- `src/routes/area-do-cliente.tsx`: `aba` vai para `validateSearch`; mesmo tratamento de carregamento; `carregar()` em recargas não volta a mostrar esqueleto.
- Novo `src/lib/area-externa.ts` com as regras puras + teste em `src/lib/__tests__/area-externa.test.ts`.
