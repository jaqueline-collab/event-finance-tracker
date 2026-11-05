# Ajustes na Fase 1 do Painel do cliente (uma rodada)

O documento anexo traz 4 itens; a mensagem cita 2 (itens 1 e 4). O plano cobre os 4 do documento. Nada é apagado e nada é publicado.

## 1. Limpar o painel (só 8c0ojhr2 e clientes com espelho)
- Criar a visão "Widgets antigos" como rascunho (não visível ao cliente, só super admin) e mover para ela todos os widgets salvos na visão Resultados, com a configuração intacta (só muda a visão a que pertencem).
- A visão Resultados mostra só o painel novo, com um único seletor de período. O cartão antigo "Resultados da conta" sai da tela do cliente e da tela de edição.
- Dr. Gean e demais clientes sem espelho continuam como estão.
- Conferir antes e depois: mesmo número de widgets e mesmas configurações.

## 2. Modo Editar
- No painel novo, Editar mostra só: Conexão e canais, "+ Nova visão", renomear, excluir, chave "Visível ao cliente" por visão e, em cada cartão novo, o menu "⋯" com "Ocultar do cliente" (guardado na configuração da visão).
- Esconder modelos de painel, nome do modelo, aviso de arrastar e construtor antigo até a Fase 2, sem botão desativado nem "em breve".
- Listar o que saiu da tela e o código que ficou sem uso (removido), sem apagar dados.

## 3. Período personalizado — diagnóstico primeiro
- Escolher 29/10 a 04/11/2026 e mostrar, por cartão, o intervalo realmente usado (início e fim em São Paulo) e o período anterior comparado.
- Corrigir para que indicadores, gráficos, chips e selos usem exatamente o mesmo intervalo, com o dia final inteiro (até 23:59:59 de São Paulo); período anterior com o mesmo número de dias, logo antes.
- Dizer o que estava errado.

## 4. Novos leads sem IMPORTED
- Por padrão, contatos com origem IMPORTED ficam fora de: indicador Novos leads, selo de variação, Leads por dia, % de ADS e rosca de origem.
- Continuam no filtro Origem; escolhendo "Importado", aparecem.
- Texto pequeno sob o indicador: "N importados fora da conta" quando houver.
- Conversas realizadas não mudam: reconferir 22/09 a 03/10 (com 30/09) contra o monday nas três colunas.

## Conferência final
- Testes novos: exclusão de IMPORTED por padrão e com filtro; intervalo inclusivo e período anterior de mesmo tamanho; visões rascunho não aparecem ao cliente; movimentação preserva quantidade de widgets.
- Rodar todos os testes, mostrar resultados e parar. Sem publicar.

## Detalhes técnicos
- Regras puras em `src/lib/painel-visual.ts` (filtro IMPORTED, contagem de importados, cálculo de intervalo) lidas por `painel-visual.functions.ts`.
- Movimentação via script de servidor único: insere visão `publicada=false` em `elora_dashboard_visoes` e atualiza `visao_id` dos widgets; idempotente.
- `visoes-painel.tsx` / `resultados-cliente.tsx` / `widget-builder.tsx`: esconder caminho antigo quando o cliente usa espelho; "Ocultar do cliente" guardado na config da visão.
