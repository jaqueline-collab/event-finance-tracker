## Plano de correção

1. **Evitar a quebra ao abrir “Novo fechamento”**
   - Blindar a página `Fechamento Mensal` para que listas novas do fechamento (`fechamentos` e `fechamentoItens`) sempre tenham fallback `[]`, mesmo quando o navegador ainda está com dados antigos salvos.
   - Ajustar o clique do botão `Novo fechamento` para preparar a competência antes de abrir o modal, sem depender de estado que pode estar desatualizado no mesmo render.

2. **Migrar dados antigos do navegador automaticamente**
   - Atualizar a versão do store persistido.
   - Adicionar uma migração que completa campos faltantes (`fechamentos`, `fechamentoItens`, `descontos`, etc.) sem o usuário precisar limpar cache ou sair da conta.

3. **Melhorar a tela de erro**
   - Manter a tela amigável, mas exibir a mensagem técnica real do erro em uma área discreta.
   - Assim, se algo voltar a quebrar, você consegue me mandar a própria tela sem abrir DevTools.

4. **Validar depois da mudança**
   - Verificar que a página compila.
   - Testar o fluxo público possível e deixar a correção pronta para você testar logado em `/resumo` clicando em `Novo fechamento`.