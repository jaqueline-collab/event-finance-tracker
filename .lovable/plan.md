# Rodapé: reposicionar selo Meta Business Partner

## O que muda
No rodapé (`src/components/landing/SiteChrome.tsx`), o selo Meta Business Partner deve ficar mais próximo ao final da página, mas separado visualmente da linha de créditos/copyright. A linha com "© 2026 EloraCRM. Todos os direitos reservados." e "DITOS & C.O LTDA" deve permanecer sozinha, discreta, sem o selo sobrepondo ou agrupado a ela.

## Implementação
- Mover o selo Meta para uma seção própria dentro do rodapé, acima da linha de créditos ou em um bloco isolado ao final.
- Manter o selo centralizado, com fundo branco/arredondado e tamanho atual (~h-10).
- Garantir espaçamento claro entre o selo e os créditos para que não pareçam um único grupo.
- Preservar o estilo fino dos créditos: `text-xs text-white/40` centralizado, com "DITOS & C.O LTDA" em tom ainda mais suave (`text-white/30`).
- Não alterar conteúdo dos créditos nem remover a razão social.

## Verificação
- Typecheck e build OK.
- Screenshot do rodapé em desktop e mobile para confirmar que o selo e os créditos estão visualmente separados e equilibrados.
