# Rodapé do site em colunas, no modelo enviado

## Como fica
O rodapé passa a ser em colunas, como no modelo enviado, e a Política de Privacidade sai de baixo da marca.

```text
[logo Elora]          Produto                  Recursos               Contato                 Segurança
Para as conversas     Central de Atendimento   Blog                   contato@eloracrm.com.br Política de Privacidade
e o negócio andarem   Chatbot                  Perguntas frequentes   Falar no chat
juntos.               Disparo de Mensagens     Seja parceiro          Elora App
[selo Meta]           CRM                      (Rabbit Agency)
                      Agentes Inteligentes
                      Rastreabilidade
---------------------------------------------------------------------------------------------
© 2026 EloraCRM. Todos os direitos reservados. · DITÓS & C.O LTDA
```

- **Primeira coluna:** logo, frase e selo Meta, como já são hoje.
- **Produto:** as 6 páginas de funcionalidades que já existem no site.
- **Recursos:** Blog, Perguntas frequentes e Seja parceiro (página da Rabbit Agency). O cartão grande da Rabbit sai, e o link dela passa a ficar nesta coluna.
- **Contato:** contato@eloracrm.com.br (clicável), o chat e o Elora App. Atenção: hoje o site mostra **contato@eloracrm.com**, sem o ".br". Só troco depois da sua confirmação. Esse endereço também aparece em outras páginas do site, que mudariam junto.
- **Política de Privacidade:** continua com suporte@eloracrm.com.br, que é o que já está em uso nela.
- **Segurança:** Política de Privacidade.
- **Linha final:** direitos autorais e razão social, escrita DITÓS & C.O LTDA, numa linha discreta.
- Só links para páginas que já existem. Nada de redes sociais, porque não tenho os endereços. Se quiser os ícones, é só me passar os links.

## Telas
- **Computador:** marca + 4 colunas lado a lado.
- **Tablet:** a marca em cima e as colunas em 2 × 2.
- **Celular:** uma coluna embaixo da outra, com espaço confortável para tocar.
- Mesmas cores escuras e amarelo do rodapé atual, nos temas claro e escuro.

## Conferência
- Prints em 390, 834 e 1440, nos dois temas, com todos os links abrindo sem pedir login.
- Não publicar.

## Detalhes técnicos
- Reescrever `Footer` em `src/components/landing/SiteChrome.tsx` (único rodapé, usado em todas as páginas públicas), com uma lista de colunas e `Link` tipado.
- Incluir `/funcionalidades/*` em `ehPaginaPublica` (`__root.tsx`), se hoje essas páginas pedirem login, para os links de Produto abrirem para qualquer visitante.
- Manter as classes e cores que o rodapé já usa.
