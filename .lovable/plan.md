Vou ajustar somente a tela de Resumo Mensal (`/resumo`) e seus PDFs:

1. **Filtro de competência**
   - Remover o chip fixo obrigatório de competência.
   - Fazer **Competência** aparecer como os outros filtros: entra pelo botão **Adicionar filtro**, pode ser removido e fica persistido até limpar/trocar.
   - Se não houver competência selecionada, o resumo mostra o histórico normalmente; para **Gerar Fechamento**, usa a competência escolhida no filtro ou a competência padrão mais recente.
   - Remover do rótulo das opções textos como **“29 prontos”, “26 prontos”, “aguardando”** — fica só o mês/ano.

2. **Colunas do Histórico no Resumo**
   - Remover a coluna **Parceiro** da tabela expandida de clientes.
   - Manter **Cliente**, **Plano**, **Vencimento**, **Status** e **Receita/mês**.
   - Abreviar nomes de plano na exibição quando forem longos.

3. **Custo sistêmico**
   - Substituir todos os textos visíveis de **Custo Operacional** por **Custo Sistêmico** onde esse valor ainda aparecer.
   - Remover a coluna **Lucro Líquido** do histórico e do PDF de resumo, conforme você pediu para deixar o resultado mais limpo.
   - Manter **Sistema / Valor do Sistema** no fechamento, sem chamar isso de operacional.

4. **PDFs e textos auxiliares**
   - No PDF de resumo e no PDF de fechamento, remover a coluna **Parceiro** nas tabelas de clientes.
   - Tirar “Parceiro” do cabeçalho do PDF quando for só informativo visual, mantendo o filtro funcionando internamente se já existir selecionado.
   - Atualizar subtítulos/descrições que ainda falam em “custo operacional”.

5. **Validação**
   - Conferir no código que não ficou texto visível com “Custo Operacional”.
   - Conferir que não existe mais “prontos” no filtro de competência.
   - Conferir que as colunas removidas não aparecem no Resumo nem nos PDFs.