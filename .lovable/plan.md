# Link "Guia da ferramenta" na Área do cliente

## O que já existe
- O menu lateral da Área do cliente tem um grupo "Links" com um item só: "Acessar o aplicativo" (ícone de seta ↗), que abre https://app.eloracrm.com.br/ em nova aba.
- O menu já sabe desenhar link externo: abre em nova aba com `rel="noopener noreferrer"`, mostra a setinha ↗ ao lado do texto e, com o menu recolhido, mostra só o ícone com o nome no tooltip.
- O mesmo menu é usado pela cliente e pela super admin em "Visualizando como cliente" (é a mesma página).

## O que vou fazer
1. Reaproveitar o grupo "Links" e o tipo de item externo que já existem: incluir "Guia da ferramenta" (ícone de livro) logo abaixo de "Acessar o aplicativo". Nenhum botão ou componente novo.
2. "Acessar o aplicativo" continua igual, porque leva a outro lugar (o login do app), não ao guia. Não há dois links para a mesma coisa.
3. Guardar o endereço do guia num único lugar global do app (constante `ELORA_GUIA_URL = "https://app.eloracrm.com.br/docs"` em um arquivo de links globais), sem nada por cliente. Aproveito para colocar ali também o endereço do app usado por esse menu, que hoje está escrito solto na página.
4. Sem botão desativado e sem "Em breve".

## Conferência
- Cliente e super admin (normal e "Visualizando como cliente"): o item aparece e abre o guia em nova aba.
- Temas claro e escuro; larguras 390 (menu em gaveta), 834 e 1440; menu recolhido mostra só o ícone com tooltip "Guia da ferramenta".
- Rodar os testes existentes. Não publicar.

## Detalhes técnicos
- Novo `src/lib/links-globais.ts` com `ELORA_APP_URL` e `ELORA_GUIA_URL`.
- `src/routes/area-do-cliente.index.tsx`: grupo "Links" ganha `{ key: "guia", label: "Guia da ferramenta", icon: BookOpen, href: ELORA_GUIA_URL }`; `APP_URL` local passa a vir da constante.
- `area-externa-layout.tsx` não muda (já trata `href`).
