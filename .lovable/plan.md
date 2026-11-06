# Um só botão "Editar" por fechamento + revisão de duplicidades

## 1. Fechamento: tirar o lápis de renomear
Hoje cada fechamento tem dois controles: o lápis "Renomear fechamento" (abre uma caixinha do navegador pedindo só o título) e o botão "Editar".

- Remover o lápis. Não existe diálogo próprio de renomear (era a caixinha do navegador), então não sobra nada sem uso.
- O botão "Editar" passa a ter o mesmo estilo e tamanho dos outros botões da linha (ícone, fundo transparente, 28 px), com o texto "Editar" na dica ao passar o mouse.
- Renomear continua existindo dentro da página de edição (título, descrição, observação e competência), com histórico da mudança.
- Nenhum dado muda.

Ponto de atenção: o lápis aparecia para qualquer pessoa com acesso ao Fechamento; a página de edição é só para administradores. Depois da mudança, só administradores poderão renomear. Se quiser manter para outras pessoas, me diga.

## 2. Regra permanente
Registrar como regra do projeto: quando já existir uma estrutura ou controle para algo, ampliar o que existe em vez de criar um segundo.

## 3. Revisão das últimas fases (só listar, sem mudar)
Conferir Matriz, regras do relatório e limpeza do Painel do cliente, e entregar a lista do que duplica algo que já existia. Candidatos já vistos, a confirmar:

- **Tela "Validação do relatório diário"** e **Matriz**: as duas mostram valores por dia com marca de "estimado".
- **"Catálogo de campos"** da tela de validação e o catálogo do editor de colunas da Matriz.
- **Lista global de suporte interno** editada dentro das "Regras do relatório" de cada cliente (lista global aparecendo em tela de cliente).
- **Configuração do cliente** aberta em dois lugares: painel lateral da Área do cliente e telas de Clientes / Configurar API (mesmos blocos de conexão e dados do Elora).
- **Painel novo** e **gráficos antigos** (visão "Widgets antigos" e construtor antigo) convivendo.

Para cada item: o que existe, onde aparece, se é duplicidade real ou papel diferente, e sugestão de unificação. Nada é alterado nesta etapa.

## Detalhes técnicos
- `src/components/financeiro/fechamento-mensal.tsx` (~1727-1751): remover botão com `window.prompt`; trocar o `Button asChild size="sm" variant="outline"` por `size="icon" variant="ghost" className="h-7 w-7"` com `PencilLine`, `title="Editar fechamento"`; limpar import `Pencil` se ficar sem uso.
- Regra registrada em `AGENTS.md`.
- Rodar os testes existentes. Não publicar.
