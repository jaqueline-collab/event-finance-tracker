# Ajustes na Homepage (rodapé, vídeo, FAQ e cores)

## Objetivo
Alinhar a página inicial (`/`) com a identidade visual que funcionou na página de Parceiros: preto, branco e azul marinho, rodapé enxuto, vídeo que começa sozinho e FAQ ocupando melhor a página.

## 1. Rodapé simplificado
- Remover a coluna "Navegação" (links Produto, Simulador, Parceiros, Elora App, Área do parceiro) — os menus que não fazem mais sentido.
- Manter apenas: marca EloraCRM + frase, e a coluna de Contato (e-mail, WhatsApp, site).
- Resultado: rodapé de 2 colunas, mais limpo e coerente com a página atual.

## 2. Vídeo com reprodução automática
- No componente `VideoIntro`, ativar autoplay: o vídeo passa a iniciar sozinho quando a página carrega, sem som (obrigatório pelos navegadores para autoplay funcionar), com um botão de volume para o visitante ativar o áudio.
- Remover a capa escura com botão de play; os controles de pausa/volume continuam disponíveis.

## 3. FAQ ocupando a página
- A seção FAQ hoje fica espremida em uma faixa estreita no centro (max-w-3xl).
- Reorganizar para layout em 2 colunas (lado esquerdo: título e texto de apoio; lado direito: as perguntas), ocupando a largura total usada nas outras seções (max-w-6xl).
- Em celular, continua em coluna única.

## 4. Cores alinhadas à página de Parceiros
Trocar o amarelo como cor principal da homepage pelo esquema da página de Parceiros (preto + branco + azul marinho):
- **Hero**: manter fundo escuro; trocar o badge e a palavra em amarelo por tons de azul marinho claro / branco, no estilo usado no hero da Rabbit.
- **Botões**: "Elora App" e "Logar" passam a seguir o padrão da página de Parceiros — botão principal branco com texto preto, botão secundário com borda branca.
- **FAQ e detalhes**: o azul de destaque do FAQ e ícones passam para o tom de azul marinho (`rabbit-navy`), sem o amarelo.
- **Botão flutuante do WhatsApp**: manter o verde do WhatsApp (cor da marca, não do tema).
- Os tokens `--color-landing-yellow` serão mantidos no CSS (usados em outras telas), apenas deixam de ser o acento da homepage.

## Arquivos alterados
- `src/routes/index.tsx` — hero, FAQ (layout e cores), rodapé enxuto, botões da navbar e do hero.
- `src/components/landing/VideoIntro.tsx` — autoplay mudo com botão de som.
- `src/styles.css` — sem mudança de tokens (reuso de `rabbit-navy`/`landing-blue`).

## Validação
- Build (`tsgo` + build-errors.log).
- Verificar no preview: vídeo rodando sozinho, FAQ em 2 colunas no desktop, rodapé enxuto, cores preto/branco/azul consistentes com a página de Parceiros.
