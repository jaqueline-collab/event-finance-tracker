# Configuração dentro da Área do cliente (só super admin)

## O que muda para você
- Ao abrir a Área do cliente de qualquer cliente (inclusive por "Ver como cliente"), sendo super admin, aparece no topo uma faixa discreta "Modo configuração" com o botão **Configurar**.
- **Configurar** abre um painel lateral largo com 4 abas: Conexão, Canais, Estrutura e campos, Painel do cliente. Tudo o que existe hoje continua lá: testar conexão, trocar chave e endereço, canais com apelido, "Histórico desde" editável, relatório diário e cartões.
- Link direto: `/area-do-cliente?como={id}&configurar=conexao|canais|estrutura|painel`.
- A aba "Visão geral" com os cartões "Em breve" e botões travados sai.
- No topo do Painel aparece a barra de visões com "Resultados" (o painel de hoje) e, só no modo configuração, "+ Nova visão" desabilitado com a dica "Na próxima rodada".

## Quem vê
- Só quem é super admin (`is_admin`). Equipe interna comum, parceiro e cliente nunca veem a faixa, o botão nem o painel; o cliente real logado também não.
- O servidor também recusa: as funções de configuração passam a exigir super admin, não basta esconder na tela.

## Redirecionamentos
- `/clientes/{id}/dados-elora`, `/clientes/{id}/integracao-elora` e `/configurar-api?cliente=...` levam para `/area-do-cliente?como={id}&configurar=conexao`.
- Em Clientes, o botão "Dados do Elora" vira "Abrir Área do cliente e configurar".
- `/configurar-api` fica só com cofre e tabela; o link da tabela vai para o mesmo destino.

## Histórico do 8c0ojhr2
- Não corrijo por código: o campo fica claro e editável na aba Conexão para você salvar 2026-10-03.

## Fora desta rodada
Sem mudanças em cálculos, fechamentos, movimentos, cofre, relatório diário/n8n, `listar-clientes`, dados ou tabelas. Sem publicar.

## Detalhes técnicos
- `area-do-cliente.tsx`: novo parâmetro `configurar` no `validateSearch` (string com fallback, validado no componente).
- Novo `src/components/configuracao-cliente-sheet.tsx`: Sheet com abas reaproveitando `ConfigurarApiCliente`, `DadosEloraCliente` (sem Visão geral) e `IntegracaoElora`; aba sincronizada com `?configurar=`.
- `area-do-cliente.index.tsx`: faixa + Sheet só se `isAdmin && como`; barra de visões no conteúdo.
- `integracao-elora.functions.ts`: helper `exigirSuperAdmin` (RPC/linha de `is_admin` via `context.supabase`) nas funções de escrita/configuração usadas pelo painel; funções lidas pelo relatório/n8n não mudam.
- `clientes_.$id.dados-elora.tsx` vira só redirect (`beforeLoad`); `dados-elora.ts` remove a aba Visão geral; testes ajustados.
- Testes novos: `abaConfigValida`, regra de visibilidade (só admin + cliente selecionado), e RLS/servidor negando a não-admin; rodar a suíte inteira.
