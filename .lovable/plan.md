# Ajustes na Homepage (rodapé, vídeo, FAQ, cores e imagens do app)

## Objetivo
Alinhar a página inicial (`/`) com a identidade visual que funcionou na página de Parceiros (preto, branco, azul marinho), adicionar o amarelo vivo como ponto de energia, enxugar o rodapé, fazer o vídeo começar sozinho, melhorar o layout da FAQ e aproveitar as imagens reais do app enviadas para dar mais força visual à seção de produto.

## 1. Rodapé simplificado
- Remover a coluna "Navegação" (Produto, Simulador, Parceiros, Elora App, Área do parceiro).
- Manter apenas: marca EloraCRM + frase e a coluna de Contato (e-mail, WhatsApp, site).
- Rodapé de 2 colunas, mais limpo.

## 2. Vídeo com reprodução automática
- No `VideoIntro`: o vídeo inicia sozinho ao carregar a página, sem som (exigência dos navegadores para autoplay), com botão visível para ativar o áudio.
- Remover a capa escura com botão de play; controles de pausa/volume continuam disponíveis.

## 3. FAQ ocupando a página
- Hoje o FAQ fica espremido numa faixa estreita central (max-w-3xl).
- Novo layout em 2 colunas (max-w-6xl): à esquerda título + texto de apoio; à direita as perguntas. Em celular, coluna única.

## 4. Cores: preto, branco, azul marinho + amarelo vivo
- **Base**: fundo escuro no hero e rodapé, branco nas seções de conteúdo, azul marinho (`rabbit-navy`) como cor principal de destaque.
- **Amarelo vivo**: usado como ponto de energia — ícones do WhatsApp flutuante, microdetalhes, badge e CTA principal no hero. Não substitui o azul marinho, mas dá o contraste.
- **Hero**: badge com borda e texto em amarelo vivo; botão principal "Elora App" em amarelo vivo com texto escuro; botão secundário "Logar" com borda branca.
- **FAQ e detalhes**: azul marinho como cor de destaque secundária; amarelo vivo em ícones pequenos ou labels.
- Botão flutuante do WhatsApp mantém o verde da marca.
- Tokens amarelos existentes (`--color-landing-yellow`) são reaproveitados; se necessário, adicionar um token mais vivo sem quebrar os demais usos.

## 5. Uso das imagens enviadas
As quatro imagens mostram telas reais do EloraCRM. Fazer upload das 4 via `lovable-assets` para `src/assets/` e usá-las assim:

- **Mockup iPhone (lista de atendimentos no app)**: destaque visual no HERO, à direita do texto em desktop — o produto aparecendo logo de cara, dentro do mockup de celular. Em celular, fica abaixo do texto.
- **Central de Atendimento (tela cheia com conversas e anexos)**: nova aba no `SistemaTour` ("Central de Atendimento") — colocada como PRIMEIRA aba, por ser a tela mais forte do produto.
- **Agente IA / Supervisor IA (cards coloridos)**: nova aba no `SistemaTour` ("Agentes de IA"), mostrando automação de verdade.
- **Importar contatos (Excel, CSV, vCard)**: nova aba no `SistemaTour` ("Importação de Contatos"), mostrando facilidade de migração.
- As 4 abas atuais do tour (Funil, Sequências, Agendadas, Relatórios) são mantidas; o tour passa a 8 itens, com rolagem horizontal no mobile já prevista.

## Arquivos alterados
- `src/routes/index.tsx` — hero (mockup do iPhone + cores), FAQ (layout e cores), rodapé enxuto, botões.
- `src/components/landing/VideoIntro.tsx` — autoplay mudo com botão de som.
- `src/components/landing/SistemaTour.tsx` — 3 novas abas com as telas enviadas.
- `src/assets/` — 4 novos ponteiros `.asset.json` (upload via `lovable-assets` a partir de `/mnt/user-uploads/`).
- `src/styles.css` — adicionar token `--color-landing-yellow-vivo` se o amarelo atual não for vivo o suficiente.

## Validação
- Build (`tsgo` + build-errors.log).
- Preview: vídeo rodando sozinho, FAQ em 2 colunas no desktop, rodapé enxuto, cores preto/branco/azul com amarelo vivo nos pontos de destaque, mockup do iPhone no hero e novas abas do tour funcionando.
