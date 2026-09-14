# Blindar o painel do cliente contra parceiro sem acesso (com teste automatizado)

## O que eu verifiquei agora no banco

Consultei as regras de acesso reais das tabelas `elora_clientes` e `elora_movimentos`. Resultado:

- A regra nova que criamos (`parceiro_pode_ver_painel`) existe nas duas tabelas.
- Mas as regras antigas de parceiro continuam lá e são **permissivas**: no Postgres, regras permissivas se somam (basta uma liberar). Ou seja, hoje a regra nova **não bloqueia nada** — um parceiro com o controle desligado ainda lê as linhas dos clientes dele pelas regras antigas.
- Além disso, a leitura do painel do cliente (`getPainelCliente`) roda com credencial de serviço, que ignora qualquer regra de acesso. Então, nesse caminho, a única proteção real hoje é a checagem dentro da função.

Conclusão honesta: a "segunda camada" que planejamos não está valendo. Não dá para resolver só mexendo nas regras das tabelas, porque as mesmas linhas que o parceiro **pode** ver na lista dele são as linhas do painel — a tabela não sabe distinguir "listar" de "abrir o painel".

## Como resolver de verdade

A proteção passa a morar no próprio banco, num ponto único por onde o painel obrigatoriamente passa.

1. Criar no banco a função de leitura `painel_cliente_dados(_cliente_id)`, que decide quem pode ler antes de devolver qualquer linha:
   - equipe interna: pode;
   - o próprio cliente logado: pode;
   - parceiro: só se o cliente for dele **e** o controle "pode abrir o painel dos clientes" estiver ligado;
   - qualquer outro caso: erro de acesso negado.
2. `getPainelCliente` deixa de ler as tabelas com credencial de serviço e passa a chamar essa função com o login da pessoa. Assim, mesmo que amanhã alguém crie um caminho novo, ele não consegue pular a checagem.
3. Ajustar as regras das tabelas para refletirem a intenção: a regra antiga de parceiro continua permitindo **listar** os clientes dele (isso é correto e é o que a Área do Parceiro precisa), e a regra redundante `..._parceiro_painel` é removida, já que dava falsa sensação de proteção. Nada de acesso novo é aberto.

## Teste automatizado

Adicionar testes com Vitest (`src/lib/__tests__/painel-cliente-rls.test.ts`), rodando contra o banco real com usuários descartáveis criados e apagados pelo próprio teste:

- Cria um parceiro de teste, dois clientes (um dele, um de outro parceiro) e um login de parceiro.
- **Controle desligado:** abrir o painel de um cliente dele é recusado; e a chamada à função de leitura no banco devolve erro/zero linhas.
- **Controle ligado:** abrir o painel de um cliente dele funciona; abrir o painel de um cliente de **outro** parceiro continua recusado.
- Ligado ou desligado, o retorno nunca contém custo, margem, lucro ou custo WTS (teste varre as chaves do payload).
- Um login de cliente só abre o próprio painel.
- Toda a massa de teste é criada e apagada no próprio teste — nenhum dado real é tocado.

Comando: `bunx vitest run`.

## Detalhes técnicos

1. Migração: `CREATE FUNCTION public.painel_cliente_dados(_cliente_id text) RETURNS jsonb`, `SECURITY DEFINER`, `SET search_path = public`, com o bloco de autorização acima; `GRANT EXECUTE ... TO authenticated`. Retorna cliente + movimentos + plano (nome), sem nenhum campo de custo.
2. Migração: `DROP POLICY clientes_select_parceiro_painel ON public.elora_clientes` e `DROP POLICY movimentos_select_parceiro_painel ON public.elora_movimentos` (regras redundantes; não removem acesso de ninguém). Essa parte pede sua confirmação por ser remoção de regra.
3. `src/lib/cliente.functions.ts`: `getPainelCliente` chama `context.supabase.rpc('painel_cliente_dados', ...)`; remove o uso de `supabaseAdmin` nesse caminho; mantém `resolverClienteId` como defesa 1 e a mensagem amigável quando o acesso foi desativado.
4. Dev dependency `vitest` + setup que lê `SUPABASE_URL`, chave publicável e service role do ambiente do servidor para criar/apagar os usuários de teste.

## Validação que eu mostro depois

Saída real do `vitest`, com cada cenário nomeado, mais a consulta às regras do banco confirmando o estado final.
