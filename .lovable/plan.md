# Novos contatos pelo canal da primeira sessão

## Regra nova (motor, vale para todos os clientes)
- Novos contatos e novos ADS: canal, atendente e equipe vêm da **primeira sessão do contato** (a mais antiga, mesmo fora do dia ou do período).
- O atendente dessa sessão segue a regra de sempre: a última mensagem humana; se não houver, o responsável; se não houver nenhum, fica vazio. A equipe vem do mapa do canal.
- O suporte interno e os atendentes ignorados **não** se aplicam a novos contatos, só às conversas (realizadas, usuário e bot). Então um contato novo cuja primeira sessão foi da Jaqueline aparece numa linha com atendente "Jaqueline Ditós", que só terá contatos novos e nenhuma conversa.
- Contato novo sem nenhuma sessão continua na linha sem canal.

## Passos
1. Motor: separar a escolha da linha do contato da escolha da linha da conversa; buscar a primeira sessão de cada contato novo no espelho de atendimentos.
2. Testes:
   - contato novo cuja única sessão é de suporte interno entra no canal dessa sessão e não conta nas conversas;
   - primeira sessão = a mais antiga;
   - contato sem sessão fica na linha sem canal.
3. Recalcular os 12 dias e mostrar, por canal, o antes e o depois só de novos contatos e novos ADS. Conferir que o total de cada dia não muda e que as conversas ficam idênticas.
4. Novo backup das linhas atuais dos 12 dias (motivo próprio, sem apagar o backup do n8n). Conferir campo a campo.
5. Regravar os 12 dias numa operação só, ler de volta, conferir as somas e mostrar a consulta de restauração para cada backup (não executada).

## Fora
- Não publicar. Parar e mostrar.
