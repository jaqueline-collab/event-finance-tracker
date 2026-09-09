# Ajustes da homepage: topo, vídeo, rodapé e FAQ

## O que muda

### 1. Topo com o vídeo como primeiro impacto
- O celular sai do topo: fica bem menor e passa a ser um detalhe dentro do tour do sistema (aba "Central de Atendimento"), não mais a imagem principal.
- O topo volta ao formato anterior, em coluna única centralizada: selo, título, frase de apoio e botões.
- Logo abaixo do texto, o vídeo aparece grande, ocupando a largura da página — é a primeira coisa que a pessoa vê em movimento.
- As cores continuam as novas (preto, branco, azul-marinho e amarelo vivo), que foi o ponto que agradou.

### 2. Rodapé alinhado, com chamada para a Rabbit
- Fim do espaço vazio: as informações passam a ocupar a largura de forma equilibrada (marca, contato e um bloco de chamada).
- Novo bloco de destaque: "Conheça a Rabbit Agency — nossa agência parceira oficial", com botão que leva para a página de Parceiros.

### 3. Página dedicada de perguntas frequentes
- Nova página `/faq` com todas as perguntas e respostas, em duas colunas, com o mesmo visual da home.
- Na home fica apenas um bloco enxuto "Tira-dúvidas" com as 3 perguntas mais comuns e um botão "Ver todas as perguntas" que leva para a página nova.
- O menu do topo e o rodapé passam a ter o link para essa página.

## Detalhes técnicos
- `src/routes/index.tsx`: hero reestruturado em coluna única sem o mockup; `VideoIntro` promovido logo abaixo do hero com largura maior; `FAQ` reduzido a 3 itens + CTA para `/faq`; footer em 3 colunas com bloco CTA para `/parceiros`.
- `src/routes/faq.tsx` (novo): rota com `head()` próprio (título, description, og:title, og:description, og:type, twitter:card), JSON-LD `FAQPage`, navbar/rodapé compartilhados com a home.
- `src/lib/landing/faqs.ts` (novo): lista única de perguntas usada pela home e pela página `/faq`, evitando duplicação.
- `src/components/landing/SistemaTour.tsx`: mockup do iPhone entra como imagem secundária na aba de Atendimento (tamanho reduzido).
- Verificação: typecheck, build e conferência visual em desktop e mobile.
