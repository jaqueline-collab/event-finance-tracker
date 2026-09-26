# Auditoria do EloraCRM (somente relatório, nada será alterado)

Aprovar ou pular este cartão não muda nada no app. Onde algo não foi confirmado agora, está marcado como **(não confirmado)**.

## 1. Estrutura e arquitetura

**Stack:** TanStack Start (React 19, Vite 7, hospedagem em edge), roteamento por arquivos em `src/routes`, estado global em um store Zustand (`src/lib/store.ts`, 881 linhas) que carrega quase tudo do banco no login (`syncFromSupabase`), Lovable Cloud (Postgres + Auth + Storage), login por e-mail/Google. Tailwind v4 com tokens em `src/styles.css`.

**Telas por área**
- Site público: `/`, `/parceiros`, `/faq`, `/blog`, `/blog/$slug`, `/funcionalidades/$slug`, `/simulador`, `/auth`, `/auth/callback`.
- Gestão interna: `/dashboard`, `/clientes` (2.233 linhas, a maior tela), `/planos`, `/financeiro` (inclui fechamento mensal e NF), `/orcamentos`, `/resumo`, `/gestao-parceiros`, `/usuarios`, `/novidades`, `/ver-como`, `/perfil`.
- Área do Parceiro: `/parceiro` (1.726 linhas: clientes, financeiro com Fechamentos/Relatórios/Notas Fiscais, calculadora, treinamento).
- Área do Cliente: `/area-do-cliente` (Dash, plano, equipe, novidades, treinamento) e `/cliente` (tela antiga — **não confirmado** se ainda é usada ou se é duplicada).
- Configurar API: `/configurar-api`, `/clientes/$id/integracao-elora`.
- Treinamento: `/treinamento` (admin) + abas nas áreas de parceiro e cliente.
- Extra: servidor MCP (`/mcp`) com 4 ferramentas de leitura.

**Tabelas por domínio**
- Clientes/planos/movimentos: `elora_clientes` (cadastro e quantidades atuais), `elora_planos` (preços, franquias, custos, ciclo), `elora_movimentos` (histórico de setup/upgrade/downgrade/troca/churn/serviço/parceiro), `elora_parceiros`, `elora_parceiro_usuarios`, `elora_cliente_usuarios`, `elora_custos` e `elora_custos_wts` (tabela de custo escalonado).
- Financeiro: `elora_financeiro` (lançamentos), `elora_fechamentos` + `elora_fechamento_itens` (fechamento congelado por cliente), `elora_descontos`, `elora_notas_fiscais` + `elora_nota_fiscal_lancamentos`.
- Integração app Elora: `elora_integracao_contas` (chave e configuração), `elora_contatos_sincronizados`, `elora_conversas_classificadas`, `elora_paineis_sincronizados`, `elora_sequencias_sincronizadas`, `elora_classificacoes_*` (descobertas, rótulos, valores), `elora_uso_snapshots`, `elora_dashboard_widgets`, `elora_dashboard_modelos`.
- Treinamento: `elora_trilhas`, `elora_trilha_videos`, `elora_progresso_video`, `elora_niveis_gamificacao`, `elora_medalhas`, `elora_medalhas_conquistadas`.
- Acesso/geral: `app_users`, `app_user_permissions`, `perfis`, `elora_notificacoes(_lidas)`, `elora_kanban_cards`, `elora_releases(_destinos)`.

**Padrão de acesso:** funções `is_equipe_interna()`, `cliente_do_usuario()`, `parceiro_do_usuario()`, `parceiro_pode_ver_painel()`, `parceiro_ve_valores()`, `painel_cliente_dados()`.

**Onde foge do padrão**
- Tabelas antigas (clientes, planos, movimentos, custos, financeiro, kanban, parceiros) ainda têm regras no formato "dono = `user_id`" (28 ocorrências nas migrações). Funciona porque a equipe usa o mesmo banco, mas é um segundo modelo convivendo com o novo.
- `is_admin()` lê `is_admin` direto em `app_users` — papel guardado na mesma tabela do usuário, não em tabela separada. Risco baixo hoje, mas é o padrão que costuma gerar escalada de privilégio.
- Quatro arquivos de servidor usam acesso privilegiado (ignora as regras do banco): `parceiro.functions.ts`, `notas-fiscais.functions.ts`, `integracao-elora.functions.ts`, `dashboard-widgets.functions.ts`. A segurança nesses pontos depende da checagem feita no código antes da consulta.
- Verificador do banco: 1 erro (uma visão que roda com permissão do criador — **não identifiquei qual**) e 12 avisos de funções privilegiadas executáveis por qualquer um (4 sem login, 8 logados).

## 2. Recursos por área

- **Clientes:** funcionando — cadastro, status ativo/trial, movimentos, troca de plano por ciclo, seleção em massa, aplicar modelo de painel em massa, ver como cliente, churn com exportação. Parcial — tela muito grande e difícil de manter. Não validado em produção de verdade — churn apagando só dados de integração.
- **Planos:** funcionando — categorias, cobrança recorrente/única, ciclo, proporcional, acompanhamento padrão, trava de módulos, ativar/inativar.
- **Fechamento mensal:** funcionando — gera, congela itens, descontos, envio ao parceiro. Pendência antiga — gerar antes do ciclo encerrar foi liberado; **não confirmado** que recálculo após movimentos retroativos não diverge do congelado.
- **Financeiro:** funcionando — lançamentos, NF por fechamento no Google Drive. Não validado em produção — anexar uma NF cobrindo vários lançamentos com arquivo real grande.
- **Configurar API / Meu Dash:** funcionando — sincronização manual, rótulos, widgets, grade arrastável, formato do número, modelos. Parcial — sincronização não é automática; filtro de usuários da API responde "acesso negado". Não validado em produção — modelo vazio criado e depois atualizado; aplicação em massa só foi testada num cliente.
- **Área do Parceiro:** funcionando — clientes, LTV, gráfico, financeiro com 3 visões, PDF, calculadora, treinamento. Não validado em produção por um parceiro real logado (só por "ver como").
- **Área do Cliente:** funcionando — Dash, plano, equipe, novidades, treinamento. Não validado com login real de cliente (só "ver como").
- **Treinamento:** funcionando — trilhas, vídeos em ordem, pontos, níveis, medalhas, filtros. Não validado — conclusão automática pelo YouTube em celular (bloqueio de reprodução automática pode afetar) e medalhas com critérios mais raros.

## 3. Cálculos financeiros

- **Mensalidade do cliente:** `receitaMensalCliente` / `explicarReceitaCliente` em `src/lib/calc/receita.ts` (licença do plano + excedentes de canais por tipo, usuários, contatos + módulos opcionais + acompanhamento).
- **Por ciclo e troca de plano:** `receitaMensalClienteEm`, `detalharCicloCliente`, `receitaCicloCliente`, `clienteFaturaEm`, com ciclo em `calc/ciclo.ts` (`getCicloCliente`) e datas em `calc/datas.ts`.
- **MRR:** `receitaMensalTotal` e `receitaSistemaTotal` (este último sem acompanhamento).
- **Custo e margem (interno):** `custoMensalCliente`/`explicarCustoCliente` (`calc/custo.ts`), custo escalonado em `calc/custos-wts.ts`, e fórmulas antigas em `calc/helena.ts`.
- **Descontos:** `calc/desconto.ts`.
- **Calculadora do parceiro:** `calcularMargemParceiro` e `calcularOrcamentoParceiro` em `parceiro.calculadora.ts`.

**Congelado x ao vivo:** o fechamento grava valores em `elora_fechamento_itens` (com `payload_snapshot`); dashboard, área do parceiro e resumo calculam ao vivo a partir do estado atual do cliente + movimentos. Já gerou confusão antes: MAU excedente caindo em R$ 0,10, fechamento travado em carregamento, e "Mensalidade base" que parecia errada (não era bug, somava acompanhamento).

**Inconsistências e duplicações**
- Duas implementações de custo (`helena.ts` e `custos-wts.ts`) com desconto de escala em duas funções (`calcularDescontoEscalaHelena` e `calcularDescontoEscala`). **Não confirmado** se ambas ainda são usadas; é o principal risco de números diferentes entre telas.
- A calculadora do parceiro tem cálculo próprio em vez de reusar `receitaMensalCliente`; uma mudança de preço em um lugar pode não chegar no outro.
- Campo antigo `canais` e `canaisInclusos` convivem com os campos por tipo (WhatsApp/Instagram/Messenger).
- Tabela de custos WTS fica em memória no navegador (`setTabelaCustosWts`); se não carregou, os cálculos usam o padrão.

## 4. Design e UX

- Cores fixas fora do tema: concentradas no site público (`SiteChrome` 15, `Simulador` 10, `faq` 7, `blog` 6, `index` 5). O painel interno está mais limpo.
- Fonte: carrega Inter junto com Space Grotesk; Inter é justamente a fonte genérica que deixa as telas com cara padrão.
- Página 404 ainda em inglês ("Page not found", "Go home").
- Telas muito longas com muitas abas e diálogos (Clientes, Parceiro, Financeiro): muitos cliques para registrar um movimento ou achar um fechamento; o alternador Fechamentos/Relatórios/Notas Fiscais fica dentro de outra aba.
- Duas telas de cliente (`/cliente` e `/area-do-cliente`) e dois lugares de configurar integração (`/configurar-api` e `/clientes/$id/integracao-elora`) — confunde quem administra.
- Celular: tabelas largas de Clientes e Financeiro dependem de rolagem lateral; a grade do Meu Dash não permite arrastar no celular (só empilha); **não revisei agora** todas as telas em 390/834.
- A tela de "Carregando..." aparece antes de todo o painel porque a checagem de login é feita no topo do app.

## 5. Débitos técnicos e riscos

**Bugs e pendências conhecidas**
- Filtro de usuários da API Elora responde "acesso negado" (depende de permissão da chave no lado do app Elora).
- Sincronização só manual.
- Painel do cliente Cirurgiões Staffs - Fischer foi substituído durante um teste e precisa ser remontado.
- Domínio `www.eloracrm.com.br` aguardando configuração de DNS.
- Papel do usuário é guardado no navegador (`elora.papel.cache.v1`) para acelerar a tela; se ficar desatualizado, a pessoa vê o menu errado por alguns segundos (o servidor continua bloqueando os dados).
- Redirecionamento para login feito no topo do app em vez do padrão de área protegida; já causou sessões travadas antes.

**Segurança com menos confiança**
- As 4 rotas com acesso privilegiado: dependem 100% de a checagem no código estar certa em cada função nova.
- Funções privilegiadas executáveis sem login (4) — precisam de revisão.
- Trava de "permissão de composição" (`parceiro_ve_valores`) aplicada em vários lugares separados (tela, PDF, servidor); é fácil esquecer em um recurso novo.
- Visão com permissão do criador apontada pelo verificador.
- Tabela `app_user_permissions` controla o menu; **não confirmado** que todas as funções do servidor também respeitam essas permissões (podem só esconder o item de menu).

**Testes:** 6 arquivos, 52 testes: calculadora do parceiro, financeiro do parceiro, grade, isolamento da integração, isolamento do painel do cliente, treinamento. **Sem cobertura:** `receita.ts` (mensalidade, ciclo, troca de plano — o cálculo mais importante), custo/margem, descontos, geração de fechamento, movimentos, notas fiscais, permissões de menu, telas.

**Configurações em aberto:** permissões da chave da API Elora por conta; bucket de fotos de perfil é privado (funciona com link temporário — **não confirmado** se expira na tela aberta por muito tempo); agendamento de sincronização; limpeza das 33 migrações antigas não é necessária, mas há migrações de "correção de correção".

## Próximos passos sugeridos (se quiser)
1. Testes para `receita.ts` e fechamento.
2. Unificar cálculo de custo em uma só implementação.
3. Revisar as funções privilegiadas e a visão apontadas pelo verificador.
4. Dividir as telas de Clientes e Parceiro em partes menores e revisar o celular.
