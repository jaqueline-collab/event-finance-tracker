# Relatório diário via API do Elora — tabela, rotas para automação externa e matriz no Dash

Reaproveita `lerApiElora` e `contaDoCliente`. Não altera cálculo de fechamento nem regra financeira.

## 1. Centralizar a leitura da conta

Exportar `contaDoCliente(clienteId)` (hoje interna em `src/lib/integracao-elora.functions.ts`) e trocar as consultas repetidas à mão em `testarIntegracaoCliente`, `listarCamposPersonalizados`, `sincronizarIntegracaoCliente` e `getIntegracaoCliente` para usarem essa função. Sem mudar comportamento, só a fonte da consulta.

## 2. Marcador de prontidão

Nova coluna `relatorio_diario_ativo boolean not null default false` em `elora_integracao_contas`, com um interruptor próprio na tela Configurar API (separado do "Ligada" geral, sem relação com o mapeamento de campos). Só clientes com esse campo `true` entram no relatório diário.

## 3. Tabela do relatório diário

Nova tabela `elora_relatorio_diario`:
- `id uuid`, `cliente_id text` → `elora_clientes(id)`, `data date` (data do relatório, não da gravação)
- inteiros: `novos_contatos`, `novos_contatos_ads`, `conversas_usuario`, `conversas_bot`, `consulta_agendada`, `consulta_agendada_ads`, `procedimento_vendido`, `procedimento_vendido_ads`
- `criado_em`, `atualizado_em`; **único por (cliente_id, data)** — gravar o mesmo dia duas vezes atualiza, não duplica.
- GRANTs: `SELECT` para `authenticated`, `ALL` para `service_role`, nada para `anon`; RLS ligado.
- Leitura: equipe interna (`is_equipe_interna()`), próprio cliente (`cliente_do_usuario()`), parceiro com painel liberado (`parceiro_pode_ver_painel(cliente_id)`) — mesmo padrão das outras tabelas de integração. Escrita: nenhuma policy de INSERT/UPDATE para logados; só o servidor grava.

## 4. Duas rotas para a automação externa (n8n)

Em `src/routes/api/public/relatorio-diario/` (prefixo público, segurança feita no próprio handler):
- Autenticação por segredo compartilhado no header `X-Automation-Secret`, comparado em tempo constante contra uma variável de ambiente do servidor (lida dentro do handler). Sem o segredo correto: 401 sem detalhe. O valor do segredo será pedido a você num formulário seguro na hora da implementação, e você cola o mesmo valor no n8n.
- **GET `listar-clientes`**: devolve, para cada cliente com `relatorio_diario_ativo = true`, `{ cliente_id, base_url, api_key }` (via `contaDoCliente`). É a única rota que expõe o token, e só mediante o segredo.
- **POST `registrar`**: corpo validado com Zod — `cliente_id`, `data` e os 8 contadores (inteiros ≥ 0). Confirma que o cliente existe e está com `relatorio_diario_ativo = true` antes de gravar (upsert por cliente + data). Campos fora da lista são ignorados.
- `supabaseAdmin` carregado dentro do handler, só depois da verificação do segredo.

## 5. Matriz no Dash da Área do Cliente

Abaixo de "Resultados da conta", nova seção **"Relatório diário"** em `src/components/resultados-cliente.tsx`, respeitando o mesmo filtro de período (7 dias, 30 dias, personalizado). Uma linha por dia, mais recente no topo, colunas nesta ordem:

```text
Data | Novos contatos | Novos contatos/ADS | Conversas do Usuário | Conversas do bot |
Consulta agendada | Consulta agendada/ADS | Procedimento vendido | Procedimento vendido/ADS
```

Cada cabeçalho (exceto Data) tem um ícone (i) com explicação curta ao passar o mouse ou tocar:
- Novos contatos: contatos criados pela primeira vez naquele dia.
- Novos contatos/ADS: desses, quantos vieram por link com UTM de campanha.
- Conversas do Usuário: contatos únicos que falaram com atendente humano no dia.
- Conversas do bot: contatos únicos que falaram com o bot no dia (um contato pode contar nas duas).
- Consulta agendada / Procedimento vendido: conversas classificadas como ganho com essa etiqueta no dia.
- .../ADS: dessas, quantas têm UTM de campanha preenchido.

Sem dados no período: estado vazio explicado, não tabela zerada. Leitura via função de servidor com sessão do usuário (RLS aplicada), mesma visão para cliente logado, parceiro liberado e "Ver como".

## Detalhes técnicos

- Uma migração aditiva: coluna `relatorio_diario_ativo` + tabela `elora_relatorio_diario` (GRANTs antes de RLS e policies, índice por cliente/data). `src/integrations/supabase/types.ts` regenerado depois.
- Rotas em `src/routes/api/public/relatorio-diario/listar-clientes.ts` e `registrar.ts`; segredo lido com `process.env` dentro do handler; comparação com `timingSafeEqual`.
- Nova função de servidor `salvarRelatorioDiarioAtivo` (requireSupabaseAuth + exigirEquipeInterna) para o interruptor; leitura da matriz via `getRelatorioDiarioCliente` com a sessão do usuário.
- Nenhum custo, margem ou valor financeiro envolvido.

## Validação

- As 4 funções passam a usar `contaDoCliente` sem mudar comportamento (suíte de testes atual íntegra).
- Ligar o marcador num cliente de teste: `listar-clientes` com o segredo certo mostra só ele; sem segredo, 401.
- `registrar` duas vezes no mesmo cliente + data: atualiza, não duplica; sem segredo, 401.
- Teste automatizado no padrão de `integracao-elora-rls.test.ts`: cliente vê só os próprios relatórios; parceiro só com painel liberado; sem vínculo, nada.
- Matriz com colunas na ordem certa, (i) funcionando, estado vazio para cliente sem dados.
- Celular (390), tablet (834) e computador (1440), temas claro e escuro; build, typecheck e testes íntegros.
