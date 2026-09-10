# Rodapé (selo Meta) + ajustes de celular

## 1. Selo Meta no rodapé
Hoje o selo Meta fica colado na mesma linha dos créditos. Ajuste em `src/components/landing/SiteChrome.tsx`:
- O selo passa a ficar em um bloco próprio, logo antes da linha de créditos, com respiro claro entre os dois.
- A linha "© 2026 EloraCRM. Todos os direitos reservados." e "DITOS & C.O LTDA" fica sozinha, fina e centralizada, sem o selo agrupado nela.
- Estilo do selo mantido (fundo branco arredondado, altura ~40px, centralizado).

## 2. Correções na visualização em celular (home)
Problemas observados na largura de 390px:
- O vídeo aparece pequeno, escuro e com os controles nativos do celular por cima; precisa ocupar a largura com proporção correta, cantos arredondados e apenas o botão de som.
- A seção "Veja o Elora funcionando" fica com uma área enorme em branco: a imagem da tela não ganha altura no celular. Definir proporção e altura mínima para a imagem, com fundo/placeholder enquanto carrega.
- As abas do tour (Central de Atendimento, Agentes de IA, Importação...) vazam para fora da tela. Manter rolagem horizontal com respiro nas bordas e sem corte visual, ou empilhar em duas linhas.
- Ajustar espaçamentos verticais das seções no celular (hero, selo Meta, tour) para não sobrar vazio.
- Revisar o restante da home (blog, perguntas frequentes, rodapé) no mesmo tamanho e corrigir o que estiver desalinhado.

## 3. Verificação
- Conferência com captura de tela em 390px (celular) e desktop, na home e nas demais páginas do site.
- Verificar que nada ultrapassa a largura da tela.
- Typecheck e build OK.
