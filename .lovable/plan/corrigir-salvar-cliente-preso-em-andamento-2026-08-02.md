# Corrigir “Salvar Cliente” preso em andamento

## Diagnóstico confirmado no código

- O botão está corretamente ligado ao `addCliente()` e possui `finally`, portanto `savingCliente` só permanece ativo enquanto a promessa de cadastro não termina.
- `addCliente()` aguarda primeiro o INSERT em `elora_clientes` e depois o INSERT do movimento de setup. Nenhuma dessas duas chamadas tem timeout próprio.
- O cliente global tenta limitar chamadas HTTP a 10 segundos, mas usa `init?.signal ?? controller.signal`. Quando a biblioteca fornece um `signal`, o `AbortController` com prazo é descartado; nesse caminho a requisição pode continuar pendente indefinidamente.
- No snapshot desta ocorrência não apareceu requisição a `elora_clientes` nem log `sessao-travada`. Isso descarta um erro de resposta já recebido, mas ainda precisamos registrar exatamente se a espera está antes do envio ou no primeiro INSERT durante a reprodução.

## Plano de correção

1. **Tornar o timeout HTTP efetivo em todos os caminhos**
   - Combinar o sinal já fornecido pela biblioteca com o sinal de timeout, em vez de escolher apenas um deles.
   - Garantir que qualquer requisição pendente seja realmente abortada após o prazo e rejeite a promessa.

2. **Proteger especificamente o cadastro de cliente**
   - Aplicar prazo explícito e mensagens distintas ao INSERT do cliente e ao INSERT do setup.
   - Preservar a regra atual: atualizar a tela somente depois de o cliente ter sido confirmado no banco.
   - Não excluir nem sobrescrever clientes, movimentos ou fechamentos existentes.

3. **Garantir encerramento visual e erro útil**
   - Manter o `finally` que sempre restaura o botão.
   - Traduzir timeout de rede para um toast claro, sem deixar “Salvando...” indefinidamente.
   - Evitar toast duplicado para a mesma falha.

4. **Validar no fluxo real**
   - Reproduzir o cadastro pela tela e acompanhar console e rede para identificar a etapa concluída.
   - Confirmar que o botão sai de “Salvando...” tanto em sucesso quanto em falha.
   - Em sucesso, recarregar a página e confirmar que o cliente e seu setup continuam presentes.
   - Simular uma requisição pendente e confirmar que ela é abortada dentro do prazo, com feedback visível.

## Limites

- Nenhuma mudança de dados, cálculo, fechamento ou regra comercial.
- A alteração fica restrita ao controle de prazo/erro da persistência e ao feedback do formulário.