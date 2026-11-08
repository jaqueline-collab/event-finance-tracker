## Atualizar o segredo SYNC_CRON_SECRET

1. Abrir o formulário seguro de atualização do segredo `SYNC_CRON_SECRET`. Você cola o valor nele. O valor é salvo direto no cofre e não passa pelo chat nem pelo código.
2. Confirmar que o segredo está definido, sem mostrar o valor.
3. Lembrete: a mesma chave precisa estar no agendador que chama a sincronização a cada 30 minutos (Supabase externo ou n8n). Se o agendador ainda usa a chave antiga, as chamadas serão recusadas até você trocar lá também.

Nada de código muda. Nada é publicado.

Observação: como o valor foi colado no chat, ele ficou no histórico da conversa. Se isso for um problema, gere uma chave nova e use essa no formulário e no agendador.
