# Ajustes visuais: Relatório diário, WebChat na home e rodapé

Quatro ajustes puramente visuais. Nenhuma lógica, estado, permissão ou cálculo muda.

## 1. Relatório diário — botões na linha do título

Hoje "Colunas", "Exportar" e "Congelar visualização" ficam na linha dos filtros (Data inicial, Data final, Canal, Atendente, Equipe) em `src/components/resultados-cliente.tsx`.

- Mover os três para a linha do título "Relatório diário", agrupados no canto superior direito.
- Cada botão vira só ícone (Colunas = Columns3, Exportar = Download, Congelar = Snowflake), com o texto atual mantido como tooltip e `aria-label` para acessibilidade.
- Os menus que abrem ao clicar (lista de colunas, formatos CSV/XLSX/PDF, janela de congelar) continuam exatamente iguais.
- A linha de filtros fica como está hoje, só sem esses três controles.
- Regras atuais preservadas: "Congelar visualização" só aparece para quem pode congelar; "Exportar" fica desabilitado quando não há linhas; travamento por visualização congelada continua valendo.

## 2. WebChat — tipografia igual à do resto do site

A faixa do WebChat e a página do artigo usam combinações de fonte que destoam das outras seções do site.

- Padronizar títulos na mesma fonte de título do site (Space Grotesk) e textos na fonte de texto do site (Inter), com os mesmos pesos e tamanhos das seções vizinhas.
- Vale para a faixa de destaque (`src/components/landing/WebchatDestaque.tsx`) e para a página do artigo do WebChat.

## 3. Home — WebChat sai de cima do vídeo e vira o destaque do blog

Hoje a faixa do WebChat aparece logo após o topo, antes do vídeo, e a seção "Do blog" mostra 4 artigos (1 destaque + 3 cards).

- Remover a faixa `WebchatDestaque` da posição atual (antes do vídeo) em `src/routes/index.tsx`.
- Na seção "Do blog": mostrar apenas o artigo do WebChat como card de destaque, mantendo o botão "Ver todos os artigos" que leva ao blog completo.
- Os demais artigos continuam acessíveis na página do blog; nada é apagado.

## 4. Rodapé — remover o telefone

- Remover o item com o número (41) 3790-0313 do rodapé (`src/components/landing/SiteChrome.tsx`).
- O e-mail de contato e o link app.eloracrm.com.br continuam no rodapé.

## Validação

- Conferir a home e o blog no computador (1440), tablet (834) e celular (390).
- Conferir o Relatório diário na Área do Cliente com os botões no novo lugar, incluindo abrir cada menu.
- Typecheck e build sem erros.

## Detalhes técnicos

- `src/components/resultados-cliente.tsx`: mover os três controles para o `CardHeader`, ao lado do `CardTitle`, usando botões `size="icon"` com tooltip.
- `src/routes/index.tsx`: remover `<WebchatDestaque />` da ordem das seções e ajustar `DoBlog` para renderizar só o card do artigo WebChat (slug em `src/lib/landing/post-webchat.ts`).
- `src/components/landing/WebchatDestaque.tsx`: o componente deixa de ser usado na home; a tipografia do artigo é ajustada em `blog.$slug.tsx` / `Artigo.tsx` se houver desvio.
- `src/components/landing/SiteChrome.tsx`: remover o `<li>` do telefone; a constante `WHATSAPP_NUMERO` em `src/lib/landing/contato.ts` só é removida se não tiver outro uso.
