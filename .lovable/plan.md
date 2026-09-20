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

## 4. Anexar NF: pasta por parceiro ou por cliente

### Onde a nota é salva no Drive

- Lançamento de cliente vinculado a um parceiro: a nota vai para a subpasta daquele parceiro, dentro da pasta principal do Drive. Todos os clientes desse parceiro usam a mesma subpasta.
- Lançamento de cliente sem parceiro (paga direto): a nota vai para a subpasta do próprio cliente.
- Cada nota fica em uma única subpasta — nunca duplicada.

### Anexar uma nota a vários lançamentos

- Na tela Financeiro, cada linha ganha caixa de seleção (mesmo padrão da seleção em massa de Clientes) e a ação "Anexar NF" atua sobre a seleção.
- Todos os selecionados do mesmo parceiro (mesmo de clientes diferentes): upload liberado, indo para a subpasta do parceiro.
- Seleção misturando parceiros diferentes, ou com e sem parceiro: bloqueio com aviso claro de que uma nota não pode cobrir pagadores diferentes.
- Um único arquivo enviado passa a ser referenciado por todos os lançamentos selecionados. Anexar a um lançamento isolado continua funcionando.

### Quem enxerga

- Nova seção "Notas Fiscais" na Área do Parceiro, listando as notas dos lançamentos dos clientes dele: competência, valor total coberto e botão de baixar.
- O download passa pelo servidor autenticado, que confere se o parceiro logado é dono da nota antes de entregar o arquivo.
- A Área do Cliente não ganha seção de notas fiscais em nenhuma hipótese.

### Precisa de você

- A conexão "Jaqueline's Google Drive" já existe e está disponível — falta só vincular a este projeto, um clique quando a implementação começar.
- O endereço da pasta principal do Drive onde as subpastas de parceiros/clientes serão criadas.

## Detalhes técnicos

- `src/lib/parceiro.calculadora.ts`: `configuracaoInicial` equivalente passa `canaisWhatsOficiais: 0`; `ConfiguracaoCalculadoraParceiro` ganha `setup: number` (usado só na base da margem, não na simulação de receita).
- `src/routes/parceiro.tsx` (`CalculadoraParceiro`): `configuracaoInicial` com oficiais em 0 e `setup: 0`; novo input "Setup (R$)" (step 0.01); o card Setup usa `config.setup`; `calcularMargemParceiro(margem, custoBase, config.setup)`.
- Pop-up com `Dialog` já importado no arquivo, disparado por um botão que embrulha o card "Mensalidade base"; conteúdo lê `usuariosInclusos`, `canaisWhatsInclusos`, `canaisInstaInclusos`, `canaisMessengerInclusos`, `incluiZapi`, `contatosInclusos` e `valorContatosExc` do plano.
- Testes em `src/lib/__tests__/calculadora-parceiro.test.ts`: margem com setup digitado nas duas bases.
- NF: migração aditiva com `elora_notas_fiscais` (id, escopo `parceiro`|`cliente`, `parceiro_id`, `cliente_id`, competência, valor coberto, `drive_file_id`, `drive_folder_id`, nome do arquivo, criado por/em) e `elora_nota_fiscal_lancamentos` (nota_id, lancamento_id) para o vínculo muitos-para-um; GRANTs e RLS: escrita só equipe interna, leitura do parceiro restrita a `parceiro_do_usuario()`.
- Upload e download em server functions com `requireSupabaseAuth` (`src/lib/notas-fiscais.functions.ts`): validam pagador único da seleção, criam/reutilizam a subpasta via Google Drive (conector, gateway server-side) e servem o arquivo só após checar posse. Chave do Drive nunca vai ao navegador.
- `src/routes/financeiro.tsx`: coluna de seleção, barra de ação "Anexar NF", diálogo de upload e indicação de nota anexada por lançamento.
- `src/routes/parceiro.tsx`: nova aba/seção "Notas Fiscais" com lista e download.

## Validação

- Trocar de plano várias vezes: API Oficial sempre volta a 0.
- Setup preenchido reflete no card Setup; entra na margem só com "mensalidade + setup".
- Pop-up no plano Essencial Rabbit Agency: 5.000 contatos, R$ 0,95 por contato excedente, usuários e canais corretos, mais o texto fixo.
- Outro plano com franquia diferente: números mudam, texto fixo igual.
- Três lançamentos de clientes diferentes da Rabbit Agency: arquivo na subpasta "Rabbit Agency" e os três apontando para a mesma nota.
- Seleção com pagadores diferentes: bloqueio com aviso.
- Área do Parceiro da Rabbit Agency mostra a nota e o download funciona; Área do Cliente sem nenhuma seção de notas.
- Lançamento de cliente sem parceiro: arquivo na subpasta do próprio cliente.
- Celular (390), tablet (834) e computador (1440), temas claro e escuro.

