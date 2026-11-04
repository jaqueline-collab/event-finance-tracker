# Configuração dentro da Área do cliente (só super admin) + canais, apelido, popup e link do painel

Executo em 3 etapas, parando entre elas para você conferir. Nada de cálculo financeiro, fechamento, movimento, cofre (só reutilizo), relatório diário/n8n, `listar-clientes` ou dados existentes muda. Sem publicar.

## Etapa A: configuração dentro da Área do cliente
1. **Modo configuração**: em `/area-do-cliente`, só para super admin vendo um cliente (inclusive "Ver como"), faixa "Modo configuração" + botão **Configurar**. Abre painel lateral largo com abas Conexão, Canais, Estrutura e campos, Painel do cliente, reaproveitando tudo que já existe (testar conexão, trocar chave, endereço, relatório diário, campos, painéis, sequências, widgets). Link direto `?como={id}&configurar=conexao|canais|estrutura|painel`.
2. **Servidor recusa** quem não for super admin nas funções de configuração (`exigirSuperAdmin`).
3. **Limpeza**: sai a aba "Visão geral" e todos os "Em breve". `/clientes/{id}/dados-elora`, `/clientes/{id}/integracao-elora` e `/configurar-api?cliente=` só redirecionam. Apago de verdade componentes e telas que ficarem sem uso e listo os arquivos apagados. `/configurar-api` fica com cofre, histórico de uso e tabela.
4. **Histórico desde**: campo claro e editável na aba Conexão; você salva 2026-10-03 do 8c0ojhr2 pela tela.
5. **Barra de visões** no Painel: "Resultados" e, só no modo configuração, "+ Nova visão" desabilitado ("Na próxima rodada").

## Etapa B: canais, apelido e popup do cliente
6. **Canais**: buscar com `ChannelType=All` para trazer WhatsApp, Instagram e Messenger. Cada linha com selo do tipo, número (WhatsApp) ou nome da conta (Instagram/Messenger), foto, ativo; ID pequeno; filtro por tipo.
7. **Apelido**: na tabela de canais permitidos, novas colunas `apelido` e `permitido` (padrão verdadeiro). Lápis para editar; exibe `apelido ?? nome do Elora` com o original embaixo; aviso "O apelido vale só aqui no EloraCRM. Nada é alterado no Elora." Só `permitido = true` sincroniza; nenhum permitido = nada sincroniza. Regras de acesso atuais mantidas.
8. **Popup em Clientes**: botão vira "Abrir Área do cliente e configurar"; bloco "Integração Elora (app)" recolhido por padrão com chip de estado (lembra só na sessão); seletor Ativo/Trial do cabeçalho vira selo fixo (Inativo / Churn, Trial ou Ativo), sem mexer nos fluxos de criação e conversão.
9. **Pacote atual — primeiro só diagnóstico**: levanto onde os valores do cliente são atualizados por upgrade/downgrade e se o popup usa "o maior entre plano e cliente". **Paro e te conto antes de mudar.** Depois da sua aprovação: mostra o valor atual no formato "5 canais (3 do plano + 2 extras)", plano base, módulos extras e valor mensal — só exibição.

## Etapa C: link para o Elora App (só super admin)
10. **Tabela nova** `elora_links_incorporacao` (cliente, hash do token, token cifrado pelo cofre, quem criou, quando, revogado, último acesso). Ninguém acessa pela API pública; só o servidor.
11. **Cartão "Link para o Elora App"** na aba Painel do cliente: mostra link, Copiar, "Gerar novo link" (revoga o anterior, com confirmação). Geração e revogação registradas no histórico de uso.
12. **Página `/incorporado/{token}`**: sem menu nem login, mostra o mesmo painel que o cliente vê, só leitura, só dados daquele cliente. Token inválido ou revogado → tela neutra. Proteções: só pode ser incorporada nos domínios do segredo `EMBED_FRAME_ANCESTORS` (padrão `https://app.eloracrm.com.br`, peço pelo formulário seguro se faltar), sem referrer, limite de acessos por IP, token nunca em log.

## Testes
Visibilidade só para super admin (tela e servidor); redirecionamentos; `nomeDoCanal` com apelido; canal com apelido e sem permissão não sincroniza; selo de status churn/trial/ativo; foto do pacote com extras e downgrades; link inválido/revogado nega, cliente A não vê B, tabela inacessível pela API pública. Suíte atual continua passando.

## Detalhes técnicos
- Sheet novo `configuracao-cliente-sheet.tsx`; `configurar` no `validateSearch` de `area-do-cliente.tsx` (string com fallback, validada no componente).
- `exigirSuperAdmin` via `context.supabase` lendo o `is_admin` do próprio usuário; funções usadas pelo n8n e pelo relatório não mudam.
- Redirecionamentos via `beforeLoad` + `redirect`.
- Migrações: `ALTER TABLE elora_dados_canais_permitidos ADD apelido text, ADD permitido boolean not null default true`; `CREATE TABLE elora_links_incorporacao` com GRANT só para service_role, RLS ligado sem policy, REVOKE de anon/authenticated.
- Página incorporada: server route/server fn pública que valida o hash SHA-256 e lê com o cliente admin filtrando pelo `cliente_id` do token; reaproveita o mesmo montador de dados de `getPainelCliente`. Cabeçalhos CSP `frame-ancestors` e `Referrer-Policy: no-referrer` na resposta.
- Limite por IP: os servidores não guardam memória entre pedidos, então o contador fica em uma janela curta gravada na própria tabela/linha de acesso (sem nova tabela de visões); se precisar de tabela própria para isso, te aviso antes.
