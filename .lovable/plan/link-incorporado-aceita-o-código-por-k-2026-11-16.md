# Link incorporado aceita o código por ?k=

## O que muda
1. **Página do link** passa a ler o código de duas formas: depois do `#` (como hoje) ou em `?k=código`. Quando vier por `?k=`, o código é lido, retirado da barra de endereço na hora sem recarregar (fica só `/incorporado`), e enviado apenas dentro das chamadas protegidas, como hoje.
2. **"Incorporar no Elora App"** mostra e copia o endereço no formato `https://eloracrm.com.br/incorporado?k=código` — é esse que deve ser colado no Elora App.
3. **Máscara** nos erros e registros também cobre `?k=` e `&k=` (o código vira `[oculto]`), além do `#` e de qualquer sequência longa.
4. Nada muda em cálculo, abas, privacidade, revogação ou moldura.

## Detalhes técnicos
- `incorporado.tsx`: no efeito inicial, `new URLSearchParams(location.search).get("k")` tem prioridade; se existir, `history.replaceState(null, "", "/incorporado")`; senão lê o hash.
- `incorporar.ts`: `mascararToken` ganha regra `([?&]k=)[A-Za-z0-9_-]{20,}`; teste unitário novo.
- `incorporar-painel.tsx`: URL com `?k=`.
- Atenção: com `?k=`, o código chega ao servidor na primeira abertura da página (antes era evitado pelo `#`); por isso a máscara nos registros do servidor cobre o parâmetro.

## Testes
- Unitário: máscara cobre `?k=`/`&k=`.
- Navegador: link com `?k=` abre as abas e a barra fica sem o código; link revogado por `?k=` mostra "não está mais disponível"; código não aparece em mensagens de erro nem em chamadas além do corpo protegido; `#` continua funcionando.
- Não publicar.
