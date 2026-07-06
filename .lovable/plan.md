## Diagnóstico

Hoje é 05/07/2026. Rabbit tem ciclo 5→4 (Jun/2026 = 05/06 → 04/07), então a competência elegível para gerar fechamento agora é **junho/2026**. Se você clicou em "Novo fechamento" na linha de **julho/2026**, o ciclo ainda vai até 04/08 → nenhum cliente aparece (correto pelas regras, mas confuso). Além disso o modal:

- Não tem seletor de competência dentro dele — fica preso na linha em que foi clicado.
- Não tem campo para o **nome do fechamento** (ex.: "Rabbit Agency – Elora CRM").
- Não usa esse nome na hora de gravar em `elora_fechamentos.titulo`.

## O que vou mudar em `src/routes/resumo.tsx`

1. **Seletor de competência dentro do modal**
   - Usar `opcoesFechamento` (competências que têm ≥1 cliente elegível) como opções de um Select no cabeçalho do modal.
   - Se o usuário abrir pela linha de julho e não houver clientes elegíveis, cair automaticamente na competência elegível mais recente (junho/2026) e mostrar um aviso curto: "Julho ainda tem ciclo em aberto — abrindo a última competência disponível (junho/2026)".
   - "Gerar Fechamento" no topo da página abre já na competência elegível mais recente.

2. **Campo Nome do Fechamento**
   - Novo `Input` obrigatório no topo do modal ("Nome do fechamento"), default = `defaultDescricaoConsolidada` (ex.: `Fechamento junho/2026 · ciclo 05/06 a 04/07`).
   - Esse valor vira o `titulo` gravado em `elora_fechamentos` (hoje o código já grava mas usando a descrição consolidada — vou trocar para o nome do fechamento).
   - Para o teste imediato do Rabbit, é só digitar **"Rabbit Agency - Elora CRM"** e gerar.

3. **Lista de contas elegíveis**
   - Confirmar (e ajustar se necessário) que `fechamentoData.ativos` continua respeitando o filtro de plano (Rabbit) + ciclo já encerrado ou último dia = hoje.
   - Todos os elegíveis já vêm marcados; permanece o "Limpar tudo" e checkboxes individuais.

4. **Descontos**
   - Manter os botões existentes: aplicar por cliente (ícone `Tag`) e desconto no fechamento inteiro (`Plus`), ambos abrindo o modal `DescontoModal` (já existente) que aceita valor fixo ou %.

5. **Ações finais**
   - Mantidos: **Limpar tudo**, **Gerar relatório (PDF)**, **Enviar para o Financeiro** (é o "Gerar fechamento" — persiste em `elora_fechamentos` + `elora_fechamento_itens` e cria lançamentos).
   - Renomear o botão "Enviar" para **"Gerar fechamento"** para casar com o vocabulário pedido.

6. **Sem mudanças fora da UI**
   - Regras de elegibilidade, cálculo de receita, descontos e persistência ficam iguais. Só ajusto o texto do `titulo` para vir do novo campo.

## Passos de validação

- `bunx tsgo --noEmit` limpo.
- Abrir `/resumo`, filtrar plano Rabbit, clicar em "Gerar Fechamento": modal abre em junho/2026 com os 13 clientes Rabbit ativos no ciclo (todos exceto os que churnaram antes de 05/06).
- Digitar "Rabbit Agency - Elora CRM", clicar em **Gerar fechamento** → registro aparece na linha de junho com esse título.
- Clicar em "Novo fechamento" na linha de julho: modal cai em junho/2026 com aviso de "ciclo de julho ainda em aberto".
