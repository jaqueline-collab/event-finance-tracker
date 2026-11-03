# Parte 2: novo menu nas Áreas do Parceiro e do Cliente

Só navegação e visual. Nenhum valor, cálculo, permissão ou regra de visibilidade muda. "Ver como" continua igual (parâmetro `como`, modo somente leitura).

## O que o usuário vê

**Área do Parceiro** (`/parceiro`): menu lateral no mesmo estilo do painel interno, no lugar da fileira de botões.
- Monitorar: Clientes
- Financeiro (só aparece se o parceiro pode ver fechamentos): Fechamentos (com "Ver auditoria", download da auditoria e "Comparar fechamentos", como hoje), Relatórios e Notas (abrem exatamente as mesmas listas de hoje)
- Ferramentas: Calculadora, Treinamento
- Links: Site do parceiro (se houver), Elora App, Apresentar ferramenta (continua com o aviso "em configuração")
- Topo da página: nome do parceiro grande + subtítulo; faixa "Visualização administrativa" quando em "Ver como".

**Área do Cliente** (`/area-do-cliente`): menu lateral com Painel, Treinamento, Novidades e o link "Acessar o aplicativo". A seção aberta passa a ficar no endereço (`?aba=`), como no parceiro.

No celular, o menu abre pelo botão do topo, igual ao painel interno.

## Regra do carregamento (lição do Financeiro)
- Menu lateral e cabeçalho ficam sempre montados; nunca são trocados por "carregando".
- O esqueleto aparece só dentro da área de conteúdo, e só até a primeira leitura concluir. Recargas depois disso mantêm o conteúdo na tela.
- Itens que dependem de permissão (ex.: Financeiro do parceiro) aparecem quando os dados chegam, sem esconder o resto.
- Erro sem dados: aviso dentro do conteúdo com "Tentar de novo", nunca carregando infinito.

## Preservado
- Valores só com `mostrar_valores_cliente`; fechamentos só com `pode_ver_fechamentos`; nada de custo, margem, lucro, WTS ou desconto de escala.
- Endereços e parâmetros atuais (`aba`, `sub`, `periodo`, `indicador`, `como`) continuam válidos.
- Redirecionamento de cliente/parceiro para a própria área continua igual.

## Testes e entrega
- Teste pequeno da regra "esqueleto só antes da primeira leitura" e do item Financeiro só com permissão.
- Conferir na prévia: parceiro (Rabbit Agency) e cliente via "Ver como", em 390/834/1440, tema claro e escuro, com recarga (F5).
- Conferir um parceiro SEM permissão de valores via "Ver como": varrer o texto da página (menu, abas, tooltips) e os PDFs gerados em busca de "R$", custo, margem, lucro, WTS e desconto de escala; nada pode aparecer.
- Publicar e listar os arquivos alterados.

## Detalhes técnicos
- Sem portal no `__root.tsx`; ele só deixa de desenhar a sidebar interna nessas áreas (como hoje) e o layout de cada área cuida do próprio menu.
- Layouts de rota:
  - `src/routes/parceiro.tsx` vira layout: menu lateral sempre montado + `<Outlet />`. O corpo atual vai para `src/routes/parceiro.index.tsx` (mesmo endereço e parâmetros).
  - `src/routes/area-do-cliente.tsx` vira layout do mesmo jeito; corpo vai para `src/routes/area-do-cliente.index.tsx`.
  - A página informa os itens do menu por um contexto (`AreaMenuContext.setItens`) criado pelo layout; o layout guarda os últimos itens, então o menu não desmonta nem pisca.
- Novo `src/components/area-externa-sidebar.tsx`: menu lateral (grupos, item ativo `bg-brand-soft`, links externos, colapsável), usando o `Sidebar` existente.
- Nas páginas: remover o esqueleto de tela inteira; esqueleto só no bloco de conteúdo, controlado por ref `jaCarregou`.
- `area-do-cliente`: `aba` passa para `validateSearch`.
- Regras puras em `src/lib/area-externa.ts` + teste `src/lib/__tests__/area-externa.test.ts`.
