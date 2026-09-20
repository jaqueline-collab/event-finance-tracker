# Calculadora: API Oficial zerada, campo de Setup e pop-up da licença base

## 1. "Quantos desses são API Oficial?" começa em 0

Hoje esse campo é pré-preenchido com a franquia de canais WhatsApp do plano. Passa a começar sempre em 0, tanto ao abrir a calculadora quanto a cada troca de plano — nenhum valor anterior é herdado. O campo "Quantos números vamos conectar?" continua pré-preenchido com a franquia do plano, e todos os números não oficiais seguem virando Z-API.

## 2. Campo "Setup (R$)" opcional

- Novo campo na calculadora, começando em 0 (vazio para o parceiro).
- O card "Setup" do resumo passa a mostrar esse valor digitado, em vez do setup do plano.
- Esse valor só entra no cálculo quando a margem estiver com "Aplicar sobre: mensalidade + setup"; com "Só mensalidade" ele fica de fora, como já definido.
- O setup não é somado à mensalidade nem ao "Total a cobrar do cliente" (que é mensal) — continua exibido à parte, como hoje.

## 3. Pop-up "O que inclui a licença base"

O card "Mensalidade base" vira clicável (cursor, realce ao passar o mouse, acessível por teclado) e abre um pop-up com:

Dinâmico, do plano selecionado:
- Usuários inclusos.
- Canais inclusos por tipo: WhatsApp, Instagram, Messenger e Z-API (franquias do plano).
- "Conversas com até [franquia] contatos únicos no mês" e "Excedente: R$ [preço] por contato".

Fixo, em qualquer plano:
- Painéis e funis ilimitados.
- Chatbots ilimitados.
- Sequências — "Com sequências você automatiza follow-up, envia newsletters e faz campanhas de disparo em massa para sua base de contatos."

## Detalhes técnicos

- `src/lib/parceiro.calculadora.ts`: `configuracaoInicial` equivalente passa `canaisWhatsOficiais: 0`; `ConfiguracaoCalculadoraParceiro` ganha `setup: number` (usado só na base da margem, não na simulação de receita).
- `src/routes/parceiro.tsx` (`CalculadoraParceiro`): `configuracaoInicial` com oficiais em 0 e `setup: 0`; novo input "Setup (R$)" (step 0.01); o card Setup usa `config.setup`; `calcularMargemParceiro(margem, custoBase, config.setup)`.
- Pop-up com `Dialog` já importado no arquivo, disparado por um botão que embrulha o card "Mensalidade base"; conteúdo lê `usuariosInclusos`, `canaisWhatsInclusos`, `canaisInstaInclusos`, `canaisMessengerInclusos`, `incluiZapi`, `contatosInclusos` e `valorContatosExc` do plano.
- Testes em `src/lib/__tests__/calculadora-parceiro.test.ts`: margem com setup digitado nas duas bases.

## Validação

- Trocar de plano várias vezes: API Oficial sempre volta a 0.
- Setup preenchido reflete no card Setup; entra na margem só com "mensalidade + setup".
- Pop-up no plano Essencial Rabbit Agency: 5.000 contatos, R$ 0,95 por contato excedente, usuários e canais corretos, mais o texto fixo.
- Outro plano com franquia diferente: números mudam, texto fixo igual.
- Celular (390), tablet (834) e computador (1440), temas claro e escuro.
