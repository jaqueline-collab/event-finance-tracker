# Ajustes: mobile, área do cliente, sino de avisos, conteúdo novo

## 1. Site no celular

- Rever toda a home em tela pequena, com foco na seção "Veja o Elora funcionando": no celular as abas viram um carrossel horizontal enxuto (ou lista compacta), a imagem da tela ocupa a largura toda sem cortar, o mockup do navegador perde a moldura pesada e o texto da aba selecionada aparece abaixo.
- Conferir também topo, vídeo, blog, tira-dúvidas e rodapé em 360–430 px de largura, corrigindo textos apertados, botões colados e espaços sobrando.
- Revisar FAQ, Blog e Parceiros no celular, já que compartilham o mesmo cabeçalho e rodapé.

## 2. Foto do perfil travada em "Enviando..."

O envio da foto é feito direto do navegador e, quando a resposta não volta, o botão fica preso sem nenhuma mensagem. Correção: enviar a foto pelo servidor autenticado (mesmo caminho já usado para salvar o perfil), com limite de tempo e mensagem de erro clara quando falhar, além de liberar o botão sempre ao final.

## 3. Área do cliente sem o painel lateral

O menu lateral (Dashboard, Clientes, Financeiro...) é só da conta administradora. Hoje ele aparece quando você entra na área do cliente pelo modo "ver como cliente". Correção: qualquer tela de cliente ou de parceiro nunca mostra esse menu — nem para o administrador visualizando. Fica só o cabeçalho com o nome da área, o tema, o sino e a bolinha do perfil.

## 4. Sino de notificações

- Um sino ao lado do botão de tema, no painel administrativo e também na área do cliente (e do parceiro, que usa o mesmo cabeçalho).
- Ao clicar, abre uma lista de avisos com título, texto, data e marcação de lido; bolinha vermelha com a quantidade de não lidos.
- Os avisos ficam guardados no banco, com regra de acesso: cada pessoa só vê os avisos destinados a ela; o administrador pode criar avisos gerais ou para um cliente específico.

## 5. Novo artigo no blog

Publicar um artigo baseado no playbook enviado: "Como reduzir custos na API Oficial do WhatsApp" — onde nasce o custo, mensagens quebradas, respostas rápidas, chatbot enxuto, IA objetiva, transferência com contexto, campanhas segmentadas, metas por tipo de atendimento, plano de 30 dias e ganhos rápidos, com os exemplos de cálculo do documento. Capa nova no mesmo estilo das existentes.

## 6. Perguntas frequentes ampliadas

Acrescentar à página de perguntas frequentes um bloco sobre a mudança de cobrança da API Oficial do WhatsApp, com as 13 perguntas do documento enviado (o que mudou, por mensagem ou por conversa, mensagens recebidas, valores, bot e IA, como reduzir impacto, quem é mais impactado, campanhas, se ainda vale a pena, o que fazer agora). A busca continua funcionando sobre todas.

## 7. Selo Meta Business Partner

Colocar o selo enviado na home em dois pontos discretos e estratégicos: uma faixa de credibilidade logo abaixo do topo/vídeo e uma menção no rodapé.

## Detalhes técnicos

- `SistemaTour.tsx`: grid responsivo, abas com scroll-snap no mobile, imagem `w-full` e moldura simplificada abaixo de `md`.
- `__root.tsx`: esconder `AppSidebar`/`SidebarTrigger` também quando a rota for `/cliente` ou `/parceiro`, não só quando `areaPropria` estiver definida.
- Upload do avatar: nova server function autenticada em `perfil.functions.ts` recebendo o arquivo em base64, gravando no bucket `avatars`; `perfil.tsx` passa a chamá-la com timeout.
- Notificações: tabela `elora_notificacoes` (usuário destino, título, texto, lida, criada_em) com GRANT + RLS por `auth.uid()`, componente `NotificationBell` no cabeçalho.
- Conteúdo: novo item em `src/lib/landing/posts.ts` + capa SVG em `src/assets/blog/`; novas perguntas em `src/lib/landing/faqs.ts` com agrupamento por tema.
- Selo Meta: enviado via Lovable Assets e usado como imagem na home.
