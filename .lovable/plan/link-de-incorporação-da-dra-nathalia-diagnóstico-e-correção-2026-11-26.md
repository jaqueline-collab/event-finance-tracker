# Link de incorporação da Dra. Nathalia: diagnóstico e correção geral

## O que os registros mostram (últimos 15 min, sem expor código)
- Link atual (criado 00:22:52 UTC = 21:22): ativo, **nenhum acesso registrado**. O anterior (00:17) foi revogado no mesmo instante da troca e também nunca foi aberto.
- Pedidos que chegaram à página de incorporação: HEAD 00:23:34 → GET 00:23:42 e HEAD 00:25:07 → GET 00:25:14 (todos com resposta 200). O par HEAD→GET é típico do Elora App conferindo o endereço pelo servidor dele e depois abrindo o quadro.
- Formato do código: **não dá para ler nos registros**. A parte depois do # nunca é enviada ao servidor (é assim por segurança), e o registro guarda só o caminho, sem o ?k=. Nenhuma mensagem de erro foi gravada.
- Por que foi recusado: como o acesso nunca foi marcado, a página não chegou a validar o código com o servidor. A frase "Este link não está mais disponível" aparece também quando o endereço chega **sem código ou com o código cortado**, e essa checagem acontece só no navegador, sem deixar registro.
- Conclusão provável (não confirmada pelos registros): o Elora App guarda o endereço **sem a parte depois do #**. O link anterior, aberto direto no navegador em 25/11 às 14:01, funcionou com o mesmo formato.

## O que muda (vale para todos os clientes)
1. **Link que sobrevive**: o único botão "Copiar link" passa a copiar o endereço com o código em `?k=`, que funciona no Elora App. A página apaga o código da barra de endereço logo após ler. Links já gerados continuam valendo: os dois formatos (# e ?k=) são aceitos.
2. **Mensagem certa na tela**: separar "O endereço chegou sem o código (o sistema pode ter cortado o link)" de "Este link foi trocado ou desativado".
3. **Registro do motivo, sem o código**: cada tentativa recusada grava só o formato (#, ?k= ou nenhum) e o motivo (ausente, cortado, desativado). Assim a próxima dúvida se responde pelos registros.
4. Nada de estrutura nova no banco; nenhum cliente com código específico.

## Como gerar um link que sobreviva (depois da mudança)
Configurar → Incorporar → gerar link → "Copiar link" → colar no Elora App. Se a frase nova "chegou sem o código" aparecer, o Elora App está cortando também o `?k=`, e o registro dirá isso.

## Detalhes técnicos
- `src/lib/incorporar.ts`: função pura `lerCodigoDoEndereco(search, hash)` → `{ token, formato, motivo }`; teste com os dois formatos, código cortado e ausente.
- `src/routes/incorporado.tsx`: usar a função; estado `motivo` para escolher a mensagem; ao recusar, chamar uma função de servidor pública que só faz `console.warn` com formato e motivo (sem token, limitada a rótulos fixos via Zod).
- `abrirLink`/`lerPainelIncorporado`: quando o código é válido mas não existe/está revogado, registrar `motivo: desativado` (sem token).
- `src/components/incorporar-painel.tsx`: o endereço copiado passa a ser `/incorporado?k=`; botão único mantido.
- Não publicar.
