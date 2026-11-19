# Página pública "Política de Privacidade"

## O que será feito
1. Nova página em **/politica-de-privacidade**, aberta para qualquer visitante, sem login (a Meta consegue acessar na revisão do app do Instagram).
2. Mesmo visual do site público: o mesmo cabeçalho, o mesmo rodapé, as mesmas fontes e cores. Abaixo do cabeçalho, o mesmo título de página usado em "Perguntas frequentes".
3. Texto exatamente como enviado, sem acréscimos:
   - coluna de leitura estreita e confortável;
   - "Última atualização: 18/11/2026" logo abaixo do título;
   - as 9 seções com o título em destaque;
   - os itens das seções 2, 3 e 7 em forma de lista;
   - suporte@eloracrm.com.br escrito por extenso e clicável, abrindo o e-mail (nas seções 1 e 7).
4. Rodapé: hoje ele não tem uma área de links, só Contato e a linha de direitos autorais. O link "Política de Privacidade" entra nessa linha de baixo do rodapé que já existe, sem criar um segundo rodapé.
5. Título e descrição próprios da página, para buscadores e para quando o link for compartilhado.

## Fica de fora (só aviso)
O texto enviado fala apenas dos dados do Instagram. O site também tem a contagem de visitas da Lovable (sem cookies e sem identificar ninguém) e o chat do Elora nas páginas públicas, e esses dois não aparecem no texto. Vou seguir o texto como você mandou. Se quiser, depois eu redijo um parágrafo sobre isso para você aprovar.

## Conferência antes de entregar
- Abrir a página sem estar logado: carrega sem pedir login e sem o menu do sistema.
- Conferir em 390, 834 e 1440 px, nos temas claro e escuro: leitura, listas, link de e-mail e link no rodapé.
- Não publicar. Depois de publicado, o endereço será https://eloracrm.com.br/politica-de-privacidade.

## Detalhes técnicos
- Nova rota `src/routes/politica-de-privacidade.tsx`, usando `Navbar`, `PageHeader` e `Footer` de `SiteChrome`, com head() próprio (title, description, og:*, canonical).
- Incluir o caminho em `ehPaginaPublica` (`__root.tsx`), para a página não pedir login e não mostrar o menu do sistema.
- `Link` para a página na linha de direitos autorais do `Footer`.
- Apenas tokens de cor do `styles.css` nos trechos novos.
