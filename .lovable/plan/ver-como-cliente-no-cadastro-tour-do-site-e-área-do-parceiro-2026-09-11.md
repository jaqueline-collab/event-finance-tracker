# Ver como cliente no cadastro, tour do site e Área do Parceiro

## 1. "Ver como cliente" dentro do cliente

- Sai da tela de Perfil (bloco "Ver como cliente" e o seletor de empresa são removidos).
- No cadastro de cada cliente, ao lado do título **Acessos à Área do Cliente**, entra um botão discreto **Ver como cliente**.
- O botão abre a Área do Cliente daquele cliente, em modo somente leitura, com o mesmo aviso de visualização que já existe hoje.

## 2. Seção "Veja o Elora funcionando"

- As abas (Central de Atendimento, Agentes de IA, etc.) passam a ficar **acima** da tela, em todas as larguras — igual ao que já ficou bom no celular.
- Linha de abas roláveis na horizontal, com a tela grande abaixo ocupando toda a largura disponível. O título e a descrição da aba selecionada aparecem logo abaixo da imagem.

## 3. Área do Parceiro

- O parceiro continua vendo todos os clientes vinculados a ele (já funciona hoje).
- Novo controle no cadastro do parceiro, ao lado de "mostrar valores": **"Pode abrir o painel dos clientes"**, ligado/desligado por parceiro, definido por você.
- Com o controle ligado, cada cliente na lista do parceiro ganha um botão **Ver painel**, que abre a Área do Cliente daquele cliente em modo somente leitura.
- Com o controle desligado, o botão não aparece e, mesmo que alguém force o endereço, o servidor recusa.
- O parceiro só consegue abrir clientes que estão vinculados a ele — nunca clientes de outro parceiro.
- Nada de custo, margem ou lucro em nenhum desses caminhos; o painel do cliente segue o mesmo que o cliente enxerga.

## Detalhes técnicos

1. Banco: nova coluna `acesso_painel_clientes boolean not null default false` em `elora_parceiros` (migração).
2. `src/routes/clientes.tsx` / `src/components/acessos-cliente.tsx`: botão `Link` para `/area-do-cliente` com `search={{ como: clienteId }}` no cabeçalho do bloco de acessos.
3. `src/routes/perfil.tsx`: remove o card "Ver como cliente" e a chamada a `listarClientesParaVer` (a função de servidor permanece disponível, sem uso na tela).
4. `src/components/landing/SistemaTour.tsx`: grid de duas colunas vira layout empilhado (abas em cima, mockup embaixo) em todos os breakpoints.
5. `src/lib/cliente.functions.ts` → `resolverClienteId`: além de `is_equipe_interna()`, aceita parceiro quando `parceiro_do_usuario()` é dono do cliente **e** `acesso_painel_clientes` estiver ligado; caso contrário mantém o erro de acesso negado. Nenhuma função de escrita é liberada.
6. `src/lib/parceiro.functions.ts`: `getPainelParceiro` passa a devolver `podeVerPainelCliente` (booleano lido na hora do banco, do parceiro visualizado), usado pela tela para mostrar ou não o botão.
7. `src/routes/parceiro.tsx`: coluna com botão "Ver painel" por cliente quando o sinalizador vier ligado.
8. `src/routes/gestao-parceiros.tsx`: novo `Switch` por parceiro, gravado pelo mesmo caminho do toggle de valores.

## Dupla camada de proteção (ponto 1 levantado)

A checagem dentro da função não basta sozinha, porque depois de aprovar o acesso a leitura do painel usa credencial de serviço. Então o banco também vai barrar:

- Nova função no banco `parceiro_pode_ver_painel(cliente_id)`: verdadeira só quando o cliente pertence ao parceiro do usuário logado **e** aquele parceiro tem `acesso_painel_clientes = true`.
- Política de leitura em `elora_clientes` e `elora_movimentos` usando essa função, além das políticas atuais. Assim, mesmo que amanhã alguém crie um caminho novo que consulte a tabela direto com a credencial do usuário, o parceiro sem o sinalizador não lê nada.
- A função continua com a checagem própria (defesa 1), e a política é a defesa 2. Nenhuma política nova abre acesso a `elora_planos` (custos), `elora_custos_wts`, `elora_financeiro`, `elora_fechamentos` ou `elora_descontos`.

## Estado sempre atual do botão (ponto 2 levantado)

- O sinalizador que mostra o botão "Ver painel" **não** entra no cache de papel em `localStorage` (`use-papel.ts`). Ele vem sempre junto do carregamento do painel do parceiro, direto do banco.
- Efeito prático: se você desligar o acesso, na próxima vez que a pessoa abrir ou recarregar a área dela o botão já some — não fica um botão fantasma que só dá erro ao clicar.
- Se mesmo assim a pessoa estiver com a tela aberta de antes e clicar, a mensagem de recusa é amigável ("este acesso foi desativado pelo Elora"), em vez de erro técnico.

## Validação

- Abrir um cliente pelo botão novo e confirmar que a Área do Cliente carrega em modo leitura.
- Com o controle desligado: confirmar que o parceiro não vê o botão, que a chamada direta é recusada pela função **e** que a consulta direta à tabela com o login do parceiro devolve zero linhas (prova da camada de banco).
- Com o controle ligado: confirmar que o parceiro abre só clientes dele e que o retorno não traz custo, margem nem lucro.
- Desligar o sinalizador com a área do parceiro aberta, recarregar e confirmar que o botão some sem precisar limpar cache.
- Conferir a seção do site em celular, tablet e desktop.

