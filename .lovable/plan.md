# O cliente ESTÁ sendo salvo — o problema é a tela não mostrar

## O que os dados mostram (verificado agora no banco)

- "Cirurgiões Staffs - Fischer" foi gravado **duas vezes**: 18:14 e 18:17 de hoje, com todos os campos corretos (plano, parceiro, canais, MAU, datas) e com o dono correto.
- O setup também foi gravado nas duas vezes (um movimento do tipo `setup` para cada cadastro).

Ou seja: o alerta de sucesso estava certo. O que falhou foi a **lista de clientes não exibir o registro recém-criado**, o que levou a repetir o cadastro e gerar duplicata.

## Causas prováveis de a lista não mostrar (a confirmar na correção)

1. A tela de Clientes guarda filtros e busca salvos no navegador (parceiro, plano, situação, período de setup/churn). Se algum filtro antigo estiver ativo, o cliente novo é criado mas fica fora da lista, sem nenhum aviso.
2. Depois do cadastro, a tela apenas insere o cliente na memória local; não há releitura do banco para garantir que o que aparece é exatamente o que foi gravado.

## Plano de correção

1. **Nunca mais esconder um cliente recém-criado**
   - Ao concluir o cadastro com sucesso, limpar busca e filtros ativos da tela de Clientes; se algum filtro precisar ser mantido, mostrar aviso em destaque "cliente criado, mas oculto pelos filtros atuais" com botão para limpar.
   - Destacar brevemente a linha do cliente recém-criado.

2. **Confirmar com o banco antes de comemorar**
   - A função de servidor passa a devolver a linha realmente gravada; se nenhuma linha voltar, o resultado é tratado como falha e não como sucesso.
   - Após o sucesso, recarregar clientes e movimentos do banco para a tela refletir exatamente o que está persistido.

3. **Evitar duplicatas por repetição**
   - Antes de gravar, checar se já existe cliente com o mesmo nome e a mesma data de início; se existir, pedir confirmação em vez de criar outro.

4. **Limpar a duplicata já criada**
   - Remover um dos dois registros "Cirurgiões Staffs - Fischer" (o das 18:14) e o setup vinculado a ele, mantendo o mais recente intacto.

5. **Validar de verdade**
   - Cadastrar um cliente com filtros ativos e confirmar que ele aparece imediatamente.
   - Dar F5 e confirmar que continua na lista, com o setup correto.

## Limites

- Nenhum outro cliente, movimento, lançamento ou fechamento será alterado ou excluído.