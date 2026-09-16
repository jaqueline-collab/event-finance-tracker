# Roadmap — Área do parceiro + API Elora

- [x] Histórico do cliente em pop-up na área do parceiro (Dialog)
- [x] LTV em dias na lista; coluna Vencimento removida
- [x] Gráfico com filtro interativo: Entradas e saídas / Ativos no mês
- [x] API do app Elora: tabelas elora_integracao_contas + elora_uso_snapshots (migração 0006)
- [x] Funções de servidor com trava is_equipe_interna() (chave nunca sai do backend)
- [x] Seção "Integração Elora (app)" no cadastro interno do cliente
- [x] Painel "Resultados" na área do cliente: mapeamento de campos personalizados, sincronização de contatos (rate limit + retomada), tabela elora_contatos_sincronizados (migração 0007) — 21 testes passando
- [x] Validação visual do painel Resultados e da aba Integração Elora (desktop 1280, celular 390, temas claro/escuro)
- [x] Testar conexão corrigido (usa /v1/contact/custom-field; distingue endereço errado, rota inexistente e falta de permissão)
- [x] Página dedicada /clientes/{id}/integracao-elora (campos, painéis, sequências, classificações, filtros)
- [x] Dashboard Resultados como primeira aba da área do cliente (consulta agendada, procedimento vendido, conversas com resposta, ranking de campanhas)
- [x] Endereço da conta vira domínio raiz; sufixos /core, /crm, /chat por serviço; jvu3dzqk migrado para https://api.wts.chat
- [x] Rótulos de classificação (agrupar valores brutos), blocos/séries configuráveis, tempos médios, gráficos mensais (12 meses), ranking com posição — migrações 0009/0010, FKs compostas NO ACTION
- [x] Área do cliente: Dash e acesso ao aplicativo no cabeçalho, saudação pelo perfil autenticado e saída da visualização para o Dashboard
- [ ] Ampliar permissões da chave de API nas contas (filtro de usuários /v1/user responde "acesso negado" em todos os prefixos)
- [ ] Agendamento automático de sincronização (hoje é manual, botão "Sincronizar")
