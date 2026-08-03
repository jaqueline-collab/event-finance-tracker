# Área do Parceiro — login próprio, visibilidade em 3 níveis

Cada parceiro (Rabbit Agency, Distribox, futuros) ganha acesso próprio ao Elora, vendo apenas os clientes vinculados a ele. O que ele enxerga é controlado em três níveis, sendo o nível de valores liberado por um toggle que só você (admin) controla.

## Os três níveis de visibilidade

**1. Sempre visível (qualquer parceiro logado)**
Clientes vinculados a ele: nome, plano contratado, status (ativo/trial/churn), data de setup, data de vencimento, data de churn, e o histórico de movimentos (upgrades/downgrades/churn) com data e o que mudou — sem nenhum valor associado.

**2. Condicional — toggle por parceiro (padrão: DESLIGADO)**
Valores cobrados dos clientes dele: mensalidade do plano, excedentes cobrados (canais, usuários, contatos/MAU, Z-API, IA), acompanhamento e o total mensal. Só aparecem se você ligar o toggle daquele parceiro.

**3. Nunca visível (bloqueio permanente, sem opção de liberar)**
Custo real pago à WTS (`elora_custos_wts` e todas as colunas de custo de `elora_planos`: `licencaBase`, `precoCanaisExc`, `precoUsuariosExc`, `precoContatosExc`, `precoIA`, `precoAsaas`, `precoZapi`, `precoTranscricaoUser`), desconto de escala, margem e lucro. Não existe toggle para isso.

## Onde fica o toggle

Nova coluna em `elora_parceiros`:

```
mostrar_valores_cliente boolean NOT NULL DEFAULT false
```

Editável apenas por admin, na tela **Parceiros** (um Switch no card/formulário de cada parceiro, com texto explicativo: "Permite que este parceiro veja os valores cobrados dos clientes dele. O custo WTS e a margem nunca são exibidos.").

## Modelo de dados (login individual por pessoa)

Uma pessoa = um login. Um parceiro pode ter várias pessoas.

Nova tabela `elora_parceiro_usuarios`:

| campo | descrição |
| --- | --- |
| `id` | identificador |
| `parceiro_id` | parceiro ao qual a pessoa pertence |
| `email` | e-mail do login (único) |
| `user_id` | vínculo com a conta de autenticação, preenchido no primeiro login |
| `nome` | nome da pessoa |
| `ativo` | permite revogar o acesso sem apagar o registro |
| `criado_por` | admin que concedeu o acesso |

Função de banco `parceiro_do_usuario()` (security definer, sem recursão) que devolve o `parceiro_id` da pessoa logada, ou nulo se ela não for parceiro. É essa função que todas as regras de acesso usam.

E uma função `parceiro_ve_valores()` que devolve verdadeiro só quando a pessoa logada pertence a um parceiro com `mostrar_valores_cliente = true`.

## Autenticação

- O parceiro entra pela mesma tela `/auth` (e-mail/senha + Google), sem tela separada.
- No primeiro login, o e-mail é casado com `elora_parceiro_usuarios` e o `user_id` é gravado (mesmo padrão já usado em `link_app_user`).
- Após o login, o roteamento decide o destino: admin/equipe interna → `/dashboard`; pessoa de parceiro → `/parceiro`.
- Quem é parceiro não vê o menu interno (Clientes, Fechamento, Financeiro, Funil, Planos, Parceiros, Usuários). A barra lateral passa a montar itens a partir do papel detectado.

## Regras de acesso no banco (RLS)

- `elora_clientes`: além das regras atuais, uma regra de leitura extra permitindo linhas onde `parceiro_id = parceiro_do_usuario()`.
- `elora_movimentos`: leitura permitida quando o cliente do movimento pertence ao parceiro da pessoa logada.
- `elora_parceiros`: a pessoa lê apenas o próprio parceiro; só admin altera (inclusive o toggle).
- `elora_parceiro_usuarios`: admin gerencia tudo; a pessoa lê apenas o próprio registro.
- `elora_custos_wts`: hoje a regra de leitura é `true` para qualquer usuário autenticado — ou seja, um parceiro logado leria o custo. Ela será substituída por uma regra restrita à equipe interna cadastrada (`is_equipe_interna()`), fechando esse acesso de forma permanente. `elora_fechamentos`, `elora_fechamento_itens`, `elora_financeiro` e `elora_descontos` já são escopados ao próprio usuário interno, então o parceiro nunca os lê.
- `elora_planos`: parceiro não lê a tabela diretamente. Ele recebe nome e franquias do plano por uma view segura `elora_planos_parceiro`, que projeta apenas colunas não sensíveis (nome, inclusos de canal/usuário/contato) e nunca as colunas de custo.

### Como o toggle chega até a consulta

Os valores não são filtrados no front — eles não saem do banco quando o toggle está desligado.

- Todos os dados da área do parceiro são lidos por funções de servidor autenticadas (`src/lib/parceiro.functions.ts`), no mesmo padrão já usado em clientes/movimentos/fechamentos.
- A função de servidor consulta `parceiro_ve_valores()`. Se for falso, o retorno é montado **sem** os campos de valor (mensalidade, excedentes, acompanhamento, total) — as chaves nem existem no objeto devolvido ao navegador.
- Se for verdadeiro, os valores cobrados são calculados com as funções de receita já existentes (`receitaMensalCliente`, `explicarReceitaCliente`) e devolvidos.
- Em nenhum dos dois casos o retorno inclui custo, margem ou lucro — esse cálculo simplesmente não é executado nesse caminho.

## Tela do parceiro (`/parceiro`)

- Cabeçalho com o nome do parceiro e resumo: total de clientes ativos, entradas e saídas do mês.
- Lista de clientes vinculados: nome, plano, status, data de setup, vencimento e churn.
- Detalhe do cliente: linha do tempo de movimentos (data, tipo, o que mudou).
- Quando o toggle está ligado: colunas/linhas adicionais com mensalidade, excedentes cobrados e total do cliente, mais um total da carteira.
- Quando desligado: nenhuma coluna de valor e nenhum espaço vazio — a tela simplesmente não tem essa dimensão.
- Em nenhum estado existem custo WTS, margem ou lucro.

## Gestão de acesso (admin)

Na tela **Parceiros**, dentro de cada parceiro:
- Switch "Mostrar valores cobrados dos clientes" (padrão desligado).
- Lista de pessoas com acesso: nome, e-mail, ativo/inativo, data de criação.
- Botões para conceder acesso (nome + e-mail), revogar (marca inativo) e reativar.

## Teste de segurança obrigatório antes de concluir

Com um login de parceiro real (Rabbit), verificar e reportar:
1. Leitura de `elora_custos_wts` → negada.
2. Leitura de colunas de custo em `elora_planos` → negada.
3. Leitura de `elora_fechamentos`, `elora_financeiro`, `elora_descontos` → negada.
4. Leitura de clientes de outro parceiro (Distribox) → zero linhas.
5. Toggle desligado → o retorno da função de servidor não contém nenhum campo de valor (inspeção do payload bruto, não da tela).
6. Toggle ligado → valores aparecem, e o payload continua sem custo/margem/lucro.
7. Login interno (admin) → tudo continua funcionando como hoje, sem regressão.

## Observações técnicas

- Migração de banco: coluna `mostrar_valores_cliente`, tabela `elora_parceiro_usuarios` (com GRANTs para `authenticated` e `service_role`), funções `parceiro_do_usuario()` e `parceiro_ve_valores()`, view `elora_planos_parceiro`, e as políticas descritas acima.
- Código novo: `src/lib/parceiro.functions.ts` (leituras autenticadas), `src/routes/_parceiro/…` ou rota `/parceiro` protegida, ajustes em `src/lib/permissions.ts` (detectar papel "parceiro") e em `src/components/app-sidebar.tsx` (menu por papel), e o bloco de gestão de acesso em `src/routes/parceiros.tsx`.
- Nada nos cálculos de fechamento, custo ou cadastro é alterado.