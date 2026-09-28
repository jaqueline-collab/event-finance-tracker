# Relatório diário: congelar visualização, abas no lugar certo e colunas arrastáveis

Só a Área do Cliente muda. Nenhuma outra tela é alterada.

## 1. Congelar visualização

- Nova tabela no banco com cliente, usuário alvo, filtros salvos (canais, atendentes, equipes, datas, colunas visíveis e ordem das colunas), quem congelou e quando. Um registro por usuário em cada cliente: congelar de novo substitui.
- Botão **Congelar visualização** aparece só para a equipe interna e para quem é do parceiro dono daquele cliente com acesso ao painel liberado (por exemplo, a Rabbit). O cliente final nunca vê o botão.
- O botão abre uma janela "Aplicar para:" com **Minha própria visualização** ou **Selecionar usuário**. A segunda opção lista os logins daquela conta de cliente que já entraram pelo menos uma vez.
- Quando essa pessoa abre o Relatório diário, os filtros salvos são aplicados e ficam travados: Canal, Atendente, Equipe, datas, Colunas e arrastar colunas. Um aviso discreto "Visualização congelada" aparece acima da tabela. O botão Exportar continua funcionando com o que está na tela.
- **Descongelar** aparece só para quem pode congelar. Ele apaga o registro e libera os filtros daquela pessoa.
- Segurança: o cliente só consegue ler o próprio registro. Salvar e apagar passam pelo servidor, que confere a permissão antes.

## 2. Conta e Minha equipe

- Os dois saem do menu de cima, que fica com Treinamento, Novidades e Acessar o aplicativo.
- Na linha das abas passam a aparecer **Dash · Relatório diário · Conta · Minha equipe**. "Conta" mostra o que hoje fica abaixo do Dash (o que está na conta, o plano e as mudanças). "Minha equipe" mostra a lista de acessos. Dash continua abrindo primeiro.

## 3. Arrastar colunas

- Os títulos das colunas podem ser arrastados. **Data** fica sempre na primeira posição e ninguém consegue soltar outra coluna antes dela.
- A ordem fica salva no navegador de cada pessoa, separada por cliente. Com a visualização congelada, vale a ordem congelada e não dá para arrastar.
- A ordem vale também para os arquivos exportados.
- No celular, arrastar com o dedo funciona por meio de uma pequena biblioteca de arrastar e soltar.

## Validação

- Pelo "Ver como" do Dr. Ricardo: congelar para um login dele, entrar como esse login e conferir o travamento e o aviso. Depois descongelar e conferir que tudo fica liberado.
- Conferir que o cliente final não vê os botões de congelar e descongelar.
- Arrastar colunas, recarregar a página e conferir que a ordem ficou salva. Tentar soltar outra coluna antes de Data e conferir que não é possível.
- Testar as abas no celular (390), no tablet (834) e no computador (1440), nos temas claro e escuro.

## Detalhes técnicos

- Migração: `relatorio_diario_filtro_congelado` (id, cliente_id → elora_clientes, usuario_alvo_id uuid, filtros jsonb, congelado_por uuid, congelado_em timestamptz default now()), UNIQUE (cliente_id, usuario_alvo_id). GRANT SELECT authenticated e ALL service_role. RLS de SELECT: `usuario_alvo_id = auth.uid()` OU `is_equipe_interna()` OU `parceiro_pode_ver_painel(cliente_id)`. Sem permissão de escrita para logins.
- `src/lib/relatorio-congelado.functions.ts`: `getFiltroCongelado`, `listarUsuariosCongelaveis` (elora_cliente_usuarios com user_id), `congelarVisualizacao` e `descongelarVisualizacao`, todos com requireSupabaseAuth. A escrita confere antes `is_equipe_interna()` ou `parceiro_pode_ver_painel`, e só depois usa supabaseAdmin (upsert/delete).
- "Minha própria visualização" usa `usuario_alvo_id = auth.uid()`. No "Ver como", o congelamento vale para o login do administrador, não para o cliente que ele está vendo.
- `resultados-cliente.tsx`: adicionar abas "conta" e "equipe" que recebem o conteúdo por props/children vindos de `area-do-cliente.tsx`; estado `ordemColunas` com localStorage `elora.relatorio.ordem.<clienteId>`; `bloqueado` desabilita os controles.
- Arrastar com `@dnd-kit/core` + `@dnd-kit/sortable` (horizontal, com suporte a toque). Data fica fora da lista ordenável.
