# Corrigir o movimento WhatsApp +1 da DISTRIBOX

## Diagnóstico confirmado

O movimento de **08/09/2026** tem um canal WhatsApp, mas também marcou novamente **Agentes de IA**, **Z-API** e **Transcrição IA**, recursos que já estavam ativos. Por isso a tela somou:

- WhatsApp: **R$ 29,99**
- Agentes de IA: **R$ 199,99**
- Total exibido incorretamente no movimento: **R$ 229,98/mês**

O plano e o fechamento estão usando corretamente **R$ 29,99 por canal WhatsApp excedente**. O problema está somente nos campos adicionais gravados nesse movimento.

## Ajuste

1. Alterar apenas o movimento `WhatsApp +1` de 08/09/2026 da DISTRIBOX.
2. Manter `canais_whats = 1`.
3. Limpar do movimento as marcações de Agentes de IA, Z-API e Transcrição IA, sem desligar esses recursos no cadastro atual do cliente.
4. Não apagar nem recriar o movimento.
5. Não alterar outros movimentos, fechamentos ou lançamentos financeiros.

## Resultado esperado

A linha do movimento passará de **+R$ 229,98/mês** para **+R$ 29,99/mês**. A composição total do fechamento permanece preservada, incluindo os recursos que já existiam antes do movimento.

## Validação

- Conferir o registro corrigido no banco.
- Abrir o fechamento da DISTRIBOX e confirmar `WhatsApp +1 · +R$ 29,99/mês`.
- Confirmar que Agentes de IA, Z-API e Transcrição continuam na composição da mensalidade.
