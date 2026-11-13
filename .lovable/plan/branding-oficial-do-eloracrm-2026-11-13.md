# Branding oficial do EloraCRM

Mudar tokens, não reescrever telas. Tudo passa por `src/styles.css`; nada fixo por cliente.

## Pendência antes de executar
Os arquivos da logo (marinho, branco, ícone do app, favicon) **não chegaram** nesta mensagem. Preciso deles para logo, ícone e favicon. Sem eles, o resto do plano pode ser executado e a logo entra depois.

## 1. Tokens que mudam (claro / escuro)

| Token | Claro | Escuro |
|---|---|---|
| background | Névoa #F5F6F8 | Grafite #0B0D12 |
| card / popover | #FFFFFF | um passo acima (~#151922) |
| foreground | Grafite #0B0D12 | #E3E6EC |
| muted-foreground | #5B6475 | #A3AAB8 (contraste >= 4,5:1) |
| border / input | #E3E6EC, 1,5 px nos campos | #2A303C |
| primary (confirmar) | Marinho #0A1F44 / texto branco | #2B4C8C / texto branco |
| brand (ação principal, IA) | Amarelo #FFCC1F / texto marinho | igual |
| brand-hover / brand-soft | #E5B200 / #FFF6D6 | #E5B200 / amarelo 16% |
| secondary (pílulas) | #DCE4F2 / texto marinho | #13306A / texto #DCE4F2 |
| accent / fin | #2B4C8C | #FFCC1F (texto marinho) |
| ring | #2B4C8C | #FFCC1F |
| sidebar | Marinho #0A1F44, texto branco; ativo amarelo com texto marinho | #0A1F44 sobre Grafite |
| novo: ia-soft / ia-foreground | #FFF6D6 / #6B5200 | amarelo 14% / #FFE27A |
| radius | 12 px controles, 18–20 px cards (`--radius-card`) | igual |

Novos tokens nomeados de marca (`--navy-*`, `--yellow-*`, `--graphite-*`, `--mist`) só como base; telas usam os semânticos.

## 2. Tipografia
Plus Jakarta Sans em tudo via Google Fonts (link no cabeçalho do app). Sai Inter e Space Grotesk. Títulos 700/800 com letter-spacing -0,01 a -0,02 em; interface 400/500/600; corpo 15–16 px.

## 3. Componentes
- Botão: `default` = amarelo/texto marinho; nova variante `confirm` = marinho/branco; `outline` = borda marinho 1,5 px. Altura mínima 44 px no toque.
- Badge: pílula #DCE4F2/marinho; variante `ia` (#FFF6D6/#6B5200 "IA ativa").
- Input/Select/Textarea: fundo Névoa, borda 1,5 px, raio 12 px.
- Card: raio 18–20 px, branco no claro.
- Novo `EloraPensando`: ícone com ponto amarelo pulsando, usado em "digitando"/"IA respondendo" no lugar dos spinners da Elora IA.

## 4. Telas afetadas (só por tokens + troca de logo)
Menu lateral (`AppSidebar`, `AreaSidebar`), cabeçalhos, Área do cliente, Área do parceiro, admin/financeiro, login, Elora IA (botão e painel), título das abas e favicon. Logo marinho sobre claro, branco sobre marinho, respiro = altura do ponto, sem slogan.

## 5. Paleta dos gráficos (proposta)
Séries distintas por luminosidade além do matiz; rótulo sempre presente.

| Série | Claro | Escuro | Luminosidade |
|---|---|---|---|
| chart-1 | Marinho #0A1F44 | #DCE4F2 | extremo |
| chart-2 | Amarelo #FFCC1F | #FFCC1F | alta |
| chart-3 | Azul médio #2B4C8C | #5B82C9 | média |
| chart-4 | Cinza #5B6475 | #8A93A5 | média-baixa |
| chart-5 | Azul claro #9DB3DB | #13306A (com borda) | alta / baixa |
| chart-6 | Âmbar #B38600 | #E5B200 | média |
| chart-7 | Cinza claro #C4C9D3 | #3B4252 | contraste invertido |

Dados "estimado" continuam com hachura/marca, não cor. Verde/vermelho só para variação positiva/negativa (tokens success/destructive).

## 6. O que sai por ser substituído
- Fontes Inter e Space Grotesk.
- Azul antigo (oklch 0.38 0.07 253) e amarelo-limão do escuro (0.91 0.19 104).
- Tokens `landing-*` com hex fixo passam a apontar para os tokens de marca (landing mantém aparência, só alinhada ao novo amarelo/marinho).
- ~35 arquivos com cor fixa (`#hex`, `text-white`, `bg-black`) trocados por tokens.
- `chart-4` roxo e `chart-5` vermelho da paleta atual.

## 7. Regras permanentes
Registrar no north-star e no `AGENTS.md`: toda tela nova usa só tokens de `src/styles.css`; contraste mínimo 4,5:1; amarelo nunca como texto sobre branco. Teste novo que falha se aparecer cor hex/`text-white`/`bg-black` fora de `styles.css`.

## Entrega após o ok
Executar, rodar testes, conferir 390/834/1440 nos dois temas (telas logadas dependem de sessão no banco externo, que não consigo abrir), listar mudanças e parar. Não publicar.
