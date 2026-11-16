# Balão do "i": texto do dicionário, aviso de cobertura dentro do balão

## 1) Causa (o que já foi conferido)
- As chaves batem: os títulos dos blocos do Dr. Ricardo (Novos leads, Conversas realizadas, TMR, TMA, Leads por dia, Leads por..., Conversas por dia) e das colunas do Relatório diário têm texto no dicionário, e o "i" da prévia lê esse texto.
- A tela publicada ainda está com a versão anterior: o "i" e os textos foram feitos depois da última publicação e nada foi publicado desde então. O balão que aparece com "Há dia(s) sem cobertura..." é o do ponto antigo, que abre sozinho ao passar o mouse e fica colado ao título, por isso parece ser o balão do "i".
- Primeiro passo da execução: confirmar isso na prévia (abrir o "i" e o ponto separadamente) antes de mudar qualquer coisa. Se o "i" da prévia também mostrar só o aviso, investigo a leitura do texto e informo a causa real.

## 2) Balão sempre com texto
- O "i" mostra: O que é, Como é contado, De onde vem (com a data usada), Avisos e Filtros em vigor; partes vazias não aparecem.
- Bloco ou coluna sem texto no dicionário: mostra o texto automático do construtor (medida, fonte, agrupamento, data). O "i" nunca some e nunca mostra só o aviso de cobertura.
- Ficam fora, como combinado, só Usuário do sistema, Bot e Conversas por atendente (aguardando sua decisão), que mostram o texto automático até lá.

## 3) Aviso de cobertura dentro do balão
- Remover o ponto antigo do título dos blocos.
- Quando o período tiver dia que pode estar incompleto, o balão ganha em Avisos a linha "Alguns dias deste período podem estar incompletos".
- No calendário (Agenda), o ponto por dia também sai; o aviso vai para o balão do "i" do bloco Agendamentos.
- Na coluna Dia do Relatório diário, trocar o texto do aviso para a mesma linguagem simples.

## 4) Conferência antes de dizer que está pronto
- Gerar um link incorporado temporário do Dr. Ricardo ("Todas as visões"), abrir o balão de Conversas realizadas, TMR, Leads por dia e de uma coluna do Relatório diário, e mostrar o print de cada um. Conferir também 390, 834 e 1440 nos dois temas.
- Revogar o link ao terminar e confirmar que ele deixou de abrir.
- Testes: bloco com texto mostra o dicionário; bloco sem texto mostra o automático; aviso de cobertura entra em Avisos; nenhuma tela usa mais o ponto antigo.
- Não publicar. Para ver na tela publicada é preciso publicar depois da sua aprovação.

## Detalhes técnicos
- `info-titulo.tsx`: novo prop `incompleto` que acrescenta a linha em Avisos; `texto` nunca nulo (quem chama passa `textoBloco(...) ?? textoAutomatico(...)`).
- `cartoes-graficos.tsx` (linha do título e calendário) e `matriz-cliente.tsx`: trocar `PontoCobertura` por `incompleto` no `InfoTitulo`; remover `ponto-cobertura.tsx` se ficar sem uso.
- Teste em `src/lib/__tests__/textos-info.test.ts` para o texto automático como reserva.
