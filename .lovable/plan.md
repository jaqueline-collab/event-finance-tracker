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
   - Nenhum link foi entregue ainda, então ninguém perde acesso.
3. No registro de erros do servidor, mascarar qualquer trecho com aparência de token (ex.: `/incorporado/abc…` vira `/incorporado/[oculto]`).
4. Testes:
   - Visitante e usuário logado recebem "sem permissão" ao tentar ler a tabela.
   - Um erro provocado com token inválido não traz o token na mensagem nem no registro.
   - O link novo abre normalmente; o revogado continua bloqueado; a moldura fora do Elora App continua bloqueada.
5. O "+ Filtro" no link fica de fora, como você pediu.

## Detalhes técnicos
- Migração: `REVOKE ALL ON public.elora_paineis_incorporados FROM anon, authenticated;` (mantém `service_role`).
- Rota passa de `incorporado.$token.tsx` para `incorporado.tsx` lendo `window.location.hash`; o cabeçalho de moldura continua aplicado ao prefixo `/incorporado`.
- `src/server.ts`: função de mascarar aplicada antes de `console.error`.
- Seção da configuração gera a URL com `#`.
