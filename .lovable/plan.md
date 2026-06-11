## Objetivo

Criar a landing page pública do **EloraCRM** em `/` com seções de marketing + simulador de preços interativo. O sistema atual (dashboard, clientes, planos, financeiro, etc.) passa a viver sob `/app/*` protegido pelo login existente. Apenas seu e-mail entra no sistema (regra atual mantida).

## Estrutura de rotas

```text
/                    → Landing (pública, SSR)
/auth                → Login (existente, sem mudança)
/app/                → Redireciona para /app/resumo
/app/resumo          → resumo.tsx atual
/app/clientes        → clientes.tsx atual
/app/planos          → planos.tsx atual
/app/financeiro      → financeiro.tsx atual
/app/parceiros, /app/orcamentos, /app/usuarios → idem
```

Os arquivos atuais de rota são movidos para `src/routes/_authenticated/app.*.tsx`, ficando protegidos pelo layout `_authenticated` gerenciado pela integração (já redireciona para `/auth` quando não logado). A sidebar passa a apontar para `/app/...`.

## Identidade visual

Paleta solicitada: **preto, branco, amarelo, azul**. Tokens semânticos em `src/styles.css`:

- `--background: #ffffff` / `--foreground: #0a0a0a`
- `--primary: #1d4ed8` (azul forte) / `--primary-foreground: #ffffff`
- `--accent: #facc15` (amarelo vivo) / `--accent-foreground: #0a0a0a`
- `--surface-dark: #0a0a0a` para seções escuras (hero, stats, footer)
- Gradientes utilitários: `--gradient-hero` (azul→preto), `--shadow-bold` (sombra amarela suave para CTAs em destaque)
- Tipografia: heading **Space Grotesk** (bold/black), body **Inter** — peso forte, vibe SaaS moderno

Composição: hero escuro com texto branco + acentos amarelos nos CTAs principais; seções claras intercaladas (stats, features, planos) com azul como cor de ação e amarelo como destaque pontual.

## Seções da landing (`src/routes/index.tsx`)

1. **Navbar fixa** — logo EloraCRM (texto), links âncora (Funcionalidades, Planos, Simulador, Contato), botão **Entrar** (amarelo) → `/auth`.
2. **Hero** (fundo preto) — headline "Para as conversas e o negócio andarem juntos.", subtítulo, CTA "Simular meu plano" (amarelo) + "Entrar" (outline branco). Mockup/ilustração do app à direita.
3. **Dados de mercado** — 5 cards com stats do WhatsApp (97%, 82%, 75%, 70%, 67%) com fontes (Opinion Box, Hazlo, CNN Brasil).
4. **Funcionalidades** — grid de 6 cards: Central de Atendimento Omnichannel, Chatbot, Disparo de Mensagens, CRM, Agentes IA (badge BETA), Rastreabilidade de Conversões.
5. **Onboarding** — timeline horizontal: Kick-Off → Configurações → Conexões → Treinamento → Tira-dúvidas.
6. **Planos** — 3 cards (Essencial / Escala destacado em amarelo / Corporativo) com preços-vitrine (R$ 349,99 / 599,99 / 899,99) e tabela comparativa colapsável de adicionais.
7. **Simulador** (seção própria, âncora `#simulador`) — descrito abaixo.
8. **FAQ** — accordion (~6 perguntas: WhatsApp oficial vs não-oficial, prazo de implantação, integrações, suporte, troca de plano, cancelamento).
9. **CTA final + Footer** — bloco escuro "Pronto para começar?" com botão Entrar; footer com contato (contato@eloracrm.com, (21) 99550-1331, app.eloracrm.com.br).

Cada seção é um componente em `src/components/landing/`.

## Simulador de preços

Componente `src/components/landing/Simulador.tsx`, totalmente client-side (cálculo na hora, sem backend).

**Inputs:**
- Plano base: radio Essencial / Escala / Corporativo (cada um traz N usuários inclusos e canais inclusos)
- Usuários adicionais: stepper (0–50)
- Canais WhatsApp Oficial (API Meta): stepper
- Canais WhatsApp Não-Oficial (Z-API): stepper
- Contas Instagram Direct: stepper
- Contas Messenger Facebook: stepper
- Toggles módulos opcionais: Agentes IA, Integração ASAAS (pagamentos), Transcrição de áudio

**Saída (sticky no lado direito em desktop, fixa em baixo no mobile):**
- Breakdown linha a linha (plano base, cada adicional × quantidade × preço unitário)
- Total mensal grande em destaque
- Botão "Falar com vendas" / "Entrar" (CTA amarelo)

**Tabela de preços de vitrine** (arquivo `src/lib/landing/precos-vitrine.ts`, isolada e fácil de editar depois):

```ts
{
  planos: {
    essencial:   { mensal: 349.99, usuariosInclusos: 3, whatsInclusos: 1, instaInclusos: 0, messengerInclusos: 0 },
    escala:      { mensal: 599.99, usuariosInclusos: 5, whatsInclusos: 1, instaInclusos: 1, messengerInclusos: 0 },
    corporativo: { mensal: 899.99, usuariosInclusos: 10, whatsInclusos: 1, instaInclusos: 1, messengerInclusos: 1 },
  },
  adicionais: {
    usuarioExtra: 29.99,
    whatsOficial: 79.99,   // (placeholder — você ajusta depois)
    whatsNaoOficial: 49.99,
    instagram: 49.99,
    messenger: 49.99,
    moduloIA: 99.00,        // (placeholder)
    asaas: 69.99,
    transcricao: 39.90,     // (placeholder)
  }
}
```

> Os valores marcados como placeholder ficam centralizados nesse arquivo para você editar quando definir a tabela final, sem mexer em componente.

## Login / acesso

- Botão "Entrar" e qualquer CTA "Acessar sistema" levam para `/auth` (tela já existente).
- Mantém-se a regra atual: apenas seu e-mail entra. Nenhuma mudança no fluxo de auth, signup ou bootstrap_admin.
- Adicionada metadata SEO no `index.tsx` (title, description, og:title, og:description, og:image opcional).

## SEO / metadata

`head()` no `index.tsx`:
- title: "EloraCRM — WhatsApp, Instagram e Messenger em um só lugar"
- description: "CRM com atendimento omnichannel, chatbot, disparo de mensagens e agentes de IA para WhatsApp, Instagram e Messenger."
- og:title / og:description equivalentes
- viewport responsivo, h1 único no hero, alt text em todas as imagens, lazy load nos mockups

## Arquivos a criar / editar

**Novos:**
- `src/routes/index.tsx` (sobrescrito — landing pública)
- `src/components/landing/Navbar.tsx`, `Hero.tsx`, `StatsWhatsApp.tsx`, `Funcionalidades.tsx`, `Onboarding.tsx`, `Planos.tsx`, `Simulador.tsx`, `FAQ.tsx`, `CTAFinal.tsx`, `Footer.tsx`
- `src/lib/landing/precos-vitrine.ts`
- `src/routes/_authenticated/app.tsx` (layout pathless do `/app`)
- `src/routes/_authenticated/app.resumo.tsx`, `app.clientes.tsx`, `app.planos.tsx`, `app.financeiro.tsx`, `app.parceiros.tsx`, `app.orcamentos.tsx`, `app.usuarios.tsx` (movem o conteúdo das rotas atuais)

**Editados:**
- `src/styles.css` — tokens da paleta preto/branco/amarelo/azul + fontes
- `src/components/app-sidebar.tsx` — links para `/app/...`
- `src/routes/__root.tsx` — fontes Google (Space Grotesk + Inter), favicon se necessário
- `src/routes/auth.tsx` — após login, redirecionar para `/app/resumo` em vez de `/`

**Removidos:**
- Rotas antigas em `src/routes/resumo.tsx`, `clientes.tsx`, etc. (movidas para `_authenticated/app.*`)

## Fora do escopo desta etapa

- Captura de leads do simulador no banco (pode virar uma etapa seguinte com edge function + tabela `leads`).
- Variações A/B da landing.
- Tradução / multi-idioma.
- Definir a tabela final de preços (você ajusta em `precos-vitrine.ts` quando decidir).
