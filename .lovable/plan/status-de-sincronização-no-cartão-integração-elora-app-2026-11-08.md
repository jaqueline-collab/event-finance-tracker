## Status de sincronização no cartão "Integração Elora (app)"

### Por que está errado hoje
O cartão lê a data da sincronização antiga, guardada no cadastro da integração. Ele não lê o estado novo de cada fonte. Por isso aparece "Ainda não houve sincronização concluída", mesmo com contatos, atendimentos, apoio e cards concluídos.

### O que muda (só exibição)
1. **Uma linha por fonte**, na ordem: contatos, atendimentos, mensagens, cards, listas da conta (apoio).
   - Concluída: "Concluída em dd/mm hh:mm (N registros)".
   - Começada e não terminada: "Em andamento, X registros".
   - Nunca rodou: "Ainda não sincronizado". A linha aparece sem destaque de erro.
   - Se a fonte tiver erro registrado, aparece um aviso curto na linha.
2. **"Última rodada automática: dd/mm hh:mm"**: a atualização mais recente entre todas as fontes daquele cliente. Hoje o sistema não marca se uma rodada foi automática ou manual. Por isso esta é a hora da última rodada de qualquer tipo, e eu mostro o rótulo como "Última rodada".
3. **Botão "Sincronizar agora"**: fica em "Sincronizando…" só durante uma execução manual aberta nesta tela. Ao terminar ou dar erro, volta ao normal. Depois disso, as linhas das fontes são relidas.
4. **Removido** o aviso "Configure o mapeamento de campos primeiro", que não tem relação com a sincronização.
5. **Mantido:** o aviso de retomada pendente e o último erro da integração. A frase "Última sincronização concluída" é trocada pelas linhas por fonte.
6. **Clientes na fonte antiga** (`fonte_dados = 'antiga'`, como o Dr. Gean) não têm estado por fonte. Para eles, o cartão continua mostrando a data antiga, como hoje.

Nada muda na lógica da sincronização, nada é apagado e nada é publicado.

### Detalhes técnicos
- `getIntegracaoCliente` (em `integracao-elora.functions.ts`) passa a devolver também `fontes`: as linhas de `elora_sync_estado` do cliente, com fonte, iniciado_em, concluido_em, registros, atualizado_em e se há erros. A leitura é só no servidor; as linhas não guardam chaves nem textos.
- Em `integracao-elora.tsx`: entra uma lista por fonte e o rótulo "Última rodada"; o aviso de mapeamento e a variável `mapeado` saem. Ao concluir, a tela relê os dados sem mostrar o esqueleto de carregamento, para o cartão não piscar.
- Um teste pequeno para o rótulo de cada fonte: concluída, em andamento, nunca rodou.
