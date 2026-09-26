# Passada de organização visual — Etapa 1: levantamento (sem corrigir nada)

Esta etapa entrega **só a lista do que foi encontrado** nas 4 frentes. Nenhum arquivo do app é alterado. Depois você escolhe o que atacar primeiro, e cada correção vira um plano separado.

## Regra da rodada
Só visual. Se algum item exigir mexer em cálculo, regra, campo, dado, permissão ou comportamento, ele entra na lista marcado **"toca em lógica — precisa da sua decisão"** e não é incluído nas correções automáticas.

## O que vou levantar

**1. Consistência visual**
- Cards, campos e botões: tamanhos de fonte, espaçamentos e cantos arredondados diferentes entre Gestão interna, Área do Parceiro, Área do Cliente, Configurar API e Treinamento.
- Cartões de indicador desenhados de jeitos diferentes em cada tela (candidatos a virar um só).
- Cores fora da identidade (verde, azul, vermelho, cinza "de fábrica") nas telas internas. Prévia: aparecem em Orçamentos, Área do Parceiro e na tela de login.

**2. Página 404**
- Confirmado: hoje está em inglês ("Page not found", "Go home") e a tela de erro grave do servidor também ("This page didn't load"). Vou propor texto em português e o visual Elora para as duas.

**3. Cliques em excesso**
- Lista de ações comuns que exigem navegação ou cliques demais (ex.: registrar movimento, anexar nota, trocar de cliente no Meu Dash, entrar no "Ver como"), com a sugestão de simplificação de cada uma — sem mudar nada.

**4. Celular (390px) e tablet (834px)**
- Capturas de tela, nos temas claro e escuro, de Clientes, Configurar API/Meu Dash, Área do Parceiro (todas as abas), Área do Cliente e Treinamento, apontando o que estoura a largura, corta texto, sobrepõe ou fica apertado.

## Como você recebe
Um relatório em chat, organizado pelas 4 frentes, com cada item assim: tela, problema, gravidade (alta/média/baixa), se toca em lógica (sim/não), e esforço estimado. No fim, uma sugestão de primeira leva.

## Detalhes técnicos
- Varredura estática em `src/routes` e `src/components` (exceto `ui/` e `landing/`) por classes de cor fixas, `rounded-*`, `text-*`, `p-*`/`gap-*` e componentes de indicador duplicados.
- Playwright com sessão logada, viewports 390/834/1440, `.dark` e claro; capturas em `/tmp/browser/auditoria-visual/`.
- Execução de `bunx vitest run` só para registrar a linha de base (52 testes) antes das correções futuras.
- Nenhuma edição de arquivo do projeto, nenhuma migração.
