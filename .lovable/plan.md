# Área do Parceiro: histórico em pop-up, LTV na lista, gráfico com dois modos — e preparação da API do app Elora

## 1. Histórico do cliente em pop-up

Hoje o histórico abre como um bloco solto no fim da página. Passa a abrir como janela sobreposta ao clicar na linha do cliente:

- título com o nome do cliente;
- lista de movimentos (setup, upgrades, downgrades) igual à de hoje;
- bloco "Composição cobrada" apenas quando o parceiro pode ver valores;
- fecha no X, clicando fora ou com Esc; rolagem interna no celular;
- o botão "Ver painel" continua funcionando sem abrir a janela.

## 2. Lista de clientes: sai Vencimento, entra LTV

- Remover a coluna **Vencimento**.
- Nova coluna **LTV** em dias por cliente: do setup (`data_inicio`) até hoje, ou até a data de churn quando cancelado. Exibição: `128 dias`; traço quando não há data de início.
- Demais colunas e filtros seguem iguais.

## 3. Gráfico com duas visões

O título "Entradas e saídas por mês" vira um seletor com duas opções clicáveis:

**Entradas e saídas** (visão atual)
- barras verdes de entradas e vermelhas de saídas no mês.

**Ativos no mês** (nova)
- barra principal: total de clientes ativos ao fim de cada mês (acumulado — quem entrou antes e ainda não saiu);
- ao lado, barra vermelha com quantos saíram naquele mês;
- mesma legibilidade de tema claro/escuro, tooltip e legenda.

A visão escolhida respeita o período dos filtros e fica guardada no endereço da página, para poder compartilhar o link já na visão certa.

## 4. Preparação para a API do app Elora

Objetivo confirmado: trazer **uso real de cada cliente** (canais, usuários, contatos, MAU) e **resultados de atendimento** (conversas, tempo de resposta e indicadores). A chave de API é **por conta/cliente**.

Esta etapa monta a estrutura; nada aparece para o cliente final ainda.

### O que será criado

1. **Credencial por cliente** — nova tabela guardando, para cada cliente, o endereço da conta no app Elora, a chave de API, se a integração está ligada e a data da última sincronização. Acesso restrito à equipe interna; chave nunca sai para o navegador nem para parceiros.
2. **Tela interna de conexão** — no cadastro do cliente, uma aba "Integração Elora" para colar endereço e chave, ligar/desligar e usar o botão **Testar conexão**, que mostra apenas "conectado" ou o motivo da falha.
3. **Camada de leitura da API** — função de servidor única que fala com o app Elora usando a chave daquele cliente, com tempo-limite, tratamento de erro amigável e um formato de dados próprio do Elora CRM (uso e resultados), para que a tela não dependa do formato do fornecedor.
4. **Armazenamento do que foi lido** — tabela de snapshots diários por cliente (uso e indicadores), para histórico, comparação com o contratado e gráficos futuros sem bater na API toda hora.
5. **Ponto de atualização** — um endereço interno de sincronização que pode ser acionado manualmente agora e por agendamento depois.

### O que fica para as próximas etapas

- Painel "Resultados" na área do cliente (o espaço já existe reservado).
- Alerta de excedente comparando uso real com o contratado.
- Agendamento automático da sincronização.

Se você já tiver a documentação da API (endereços e campos de resposta), me envie: com ela eu ligo a leitura de verdade na mesma etapa; sem ela, entrego a estrutura e um cliente de leitura preparado para ajuste rápido.

## Detalhes técnicos

- `src/routes/parceiro.tsx`: histórico migra para `Dialog` (shadcn), coluna `dataVencimento` sai da tabela, coluna LTV calculada com o mesmo cálculo em dias já usado nos cartões de resumo; `serieMensal` ganha `ativos` acumulados por mês (entradas acumuladas − saídas acumuladas até o mês) e o modo do gráfico entra no `searchSchema` como `grafico: "fluxo" | "ativos"`.
- Sem mudança nas funções de servidor do parceiro para os itens 1–3; nenhum dado financeiro é tocado.
- API Elora: migração com `elora_integracao_contas` (cliente_id, base_url, api_key, ativo, ultima_sync) e `elora_uso_snapshots` (cliente_id, data, uso jsonb, indicadores jsonb), ambas com GRANT e RLS somente para equipe interna; leitura via `createServerFn` em `src/lib/integracao-elora.functions.ts`, chave lida apenas dentro do handler.

## Validação

- Clicar em um cliente abre a janela; Esc e clique fora fecham; "Ver painel" não abre a janela.
- Conferir ausência de Vencimento e LTV coerente para um cliente ativo e um cancelado.
- Alternar as duas visões do gráfico e conferir que "Ativos no mês" acumula corretamente.
- Testar em celular, tablet e computador, nos temas claro e escuro.
- Confirmar que a chave de API não aparece em nenhum retorno para o navegador.
