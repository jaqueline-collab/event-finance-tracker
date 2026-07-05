Plano para corrigir o erro da página `/resumo`:

1. **Remover o loop de renderização do modal**
   - Ajustar os `useEffect` que atualizam seleção, descrição e descrições por cliente para só chamar `setState` quando o valor realmente mudou.
   - Evitar dependências instáveis como objetos/arrays completos de `fechamentoData` nos efeitos; usar chaves estáveis (`competência + ids + defaults serializados`).

2. **Corrigir elegibilidade de fechamento**
   - Incluir contas cujo ciclo já encerrou **ou cujo último dia do ciclo é hoje**, conforme solicitado.
   - Manter fora da lista contas ainda não disponíveis.

3. **Blindar o clique em “Novo fechamento”**
   - Abrir o modal com uma competência estável.
   - Resetar/selecionar contas apenas uma vez por competência/lista de contas, sem reentrar em loop.

4. **Validar no navegador**
   - Abrir `/resumo`, clicar em “Novo fechamento”, confirmar que o modal aparece sem tela de erro.
   - Conferir que os botões “Visualizar relatório” e “Exportar PDF” continuam removidos, ficando apenas as ações pedidas.