# Conferência de segurança do link incorporado

## O que a conferência encontrou
1. **Proteção por linha: ligada.** A tabela dos links tem a proteção ligada e nenhuma política. Pelo navegador, nem visitante nem usuário logado lê ou grava uma linha. Só o servidor lê.
2. **Mesmo assim, as permissões de base estão abertas além do necessário.** Visitante e usuário logado ainda têm permissão de leitura e gravação na tabela. Hoje é a proteção por linha que barra esses acessos. Proposta: retirar essas permissões, para haver duas barreiras e não uma.
3. **Token em logs e erros.**
   - Nenhuma linha de código registra o token.
   - As mensagens de erro do link são fixas ("link revogado ou não existe") e não repetem o token.
   - Porém, o token faz parte do endereço (`/incorporado/<token>`). Endereços de página ficam no registro de acessos da hospedagem e no histórico do navegador.
   - Além disso, se a página quebrar, o registro de erro do servidor pode incluir o endereço da página.

## O que proponho fazer (sem mexer em números nem telas)
1. Retirar do visitante e do usuário logado qualquer permissão na tabela dos links. Fica só o servidor.
2. Tirar o token do endereço visto pelo servidor: o link passa a ser `/incorporado#<token>`. O trecho depois do `#` não sai do navegador nem entra no registro de acessos. A página envia o token só dentro da chamada protegida.
   - O link de teste já colocado no Elora App será invalidado (aprovado); você gera um novo depois de publicar.
3. No registro de erros do servidor, mascarar qualquer trecho com aparência de token (ex.: `/incorporado/abc…` vira `/incorporado/[oculto]`).
4. Testes:
   - Visitante e usuário logado recebem "sem permissão" ao tentar ler a tabela.
   - Um erro provocado com token inválido não traz o token na mensagem nem no registro.
   - O link novo abre normalmente; o revogado continua bloqueado; a moldura fora do Elora App continua bloqueada.
5. O "+ Filtro" no link fica de fora, como você pediu.

## Opção "Todas as visões" (novo pedido)
1. Na lista "Visão incorporada", a primeira opção passa a ser **Todas as visões**, já escolhida. A opção de uma visão só continua existindo.
2. Com ela, um único link por cliente abre o painel com abas, só leitura:
   - só as visões marcadas como "Visível ao cliente", na mesma ordem e com os mesmos nomes do painel do cliente;
   - quem vê troca de aba, mas não renomeia, reordena, oculta nem edita nada;
   - a lista de abas é lida a cada abertura: visão nova marcada como visível aparece sozinha, visão ocultada some na hora, sem link novo.
3. Cada aba segue as regras do painel normal: mesmo cálculo, filtros fixos e suporte escondido. **Por padrão o link mostra exatamente o que o painel normal mostra**, inclusive nome e telefone, tabelas de itens, calendário e blocos agrupados por nome. A opção por link passa a ser "Ocultar dados de pacientes (nome e telefone)", desligada por padrão (vale também para o link de uma visão só).
4. Revogar, gerar novo, aviso de app.eloracrm.com.br e último acesso funcionam igual.
5. **Relatório diário** entra como aba do link, na mesma posição do painel do cliente e com o mesmo cálculo. Mostra **todas as colunas** do painel normal, inclusive Social Selling e ADS, só para leitura: sem editar, sem Congelar e sem exportar.
6. Retrato: cada visão pelo link "Todas" comparada ao painel normal, em 14/10–12/11 e 22/09–03/10. Testes e conferência em 390, 834 e 1440, nos dois temas.

## Ajustes só no link incorporado
1. **Largura total:** o conteúdo ocupa toda a largura e altura da moldura, com respiro de 16px. Os blocos se reorganizam pela largura, sem rolagem lateral. As abas ficam sempre visíveis no topo, inclusive em moldura estreita.
2. **Botão "Abrir área do cliente"**, discreto, no canto do topo. Ele abre a tela de login do EloraCRM numa aba nova, nunca dentro da moldura. Se a pessoa já estiver logada, entra direto. Funciona no celular. O painel normal não muda.
3. Conferência em 390, 834 e 1440 nos dois temas, mais uma moldura estreita (cerca de 320px).

## Detalhes técnicos
- Migração: `REVOKE ALL ON public.elora_paineis_incorporados FROM anon, authenticated;` (mantém `service_role`).
- Rota passa de `incorporado.$token.tsx` para `incorporado.tsx` lendo `window.location.hash`; o cabeçalho de moldura continua aplicado ao prefixo `/incorporado`.
- `src/server.ts`: função de mascarar aplicada antes de `console.error`.
- Seção da configuração gera a URL com `#`.
- "Todas as visões": `visao_id` passa a aceitar vazio (migração); índice de link ativo único por cliente quando vazio. O servidor lê `elora_dashboard_visoes` com `publicada = true` ordenado por `ordem` a cada chamada, e o cálculo valida o bloco pedido contra a aba pedida.
- Relatório diário no link: mesma função de montagem da Matriz do painel do cliente, chamada pelo servidor com o cliente do link, com todas as colunas; edição manual, ADS editável e exportar desligados no link.
- Botão: `<a href="https://eloracrm.com.br/area-do-cliente" target="_blank" rel="noopener noreferrer">`; o login já redireciona quem tem sessão.
- Privacidade: a coluna `dados_pessoais` passa a significar "ocultar" (padrão falso, links existentes revogados), invertendo o filtro de blocos com nome/telefone.
