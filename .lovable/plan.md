# Usuário sem nome, conferência de Lara e Vinicio, textos do "i" e títulos de campanha

## 1. Quem é o usuário sem nome (só leitura, nada muda)
- Listar cada id distinto das mensagens sem nome nas 124 conversas de 14/10 a 12/11.
- Para cada id: se existe no cadastro de usuários da conta, se foi removido, se o nome aparece em outro lugar do Elora App (histórico de cards, atendimentos, contatos), e se as mensagens parecem automáticas (modelo, chatbot, envio por API, horário e texto repetidos) ou digitadas por uma pessoa. O texto das mensagens não sai do servidor: confiro só o tipo, a origem e o padrão.
- Entrego a conclusão num retrato para você escolher entre "Usuário do sistema" e "Bot".

## 2. Conferência de Lara Silva e Vinicio (só leitura)
- Lara, 14/10 a 12/11: dos 24 atendimentos, quantos têm resposta dela só em dias sem mensagem do paciente (e por isso não geram conversa para ela).
- Vinicio, 22/09 a 03/10: a mesma contagem para os 125 atendimentos e 97 conversas.
- Os números entram no mesmo retrato.

## 3. Texto do "i" de Conversas por atendente
- Acrescentar: a conversa do dia só conta para quem respondeu naquele mesmo dia, e a coluna Atendimentos é a medida mais fiel da carga de cada pessoa.
- Esse texto e os de Usuário do sistema e Bot ficam na lista, mas **não são gravados** até você responder o item 1.

## 4. "Campanha de anúncio" nos títulos
- Trocar "UTM" por "Campanha de anúncio" (origem, nome, página de entrada) nos títulos das colunas e dos campos mostrados nas telas. Os nomes guardados e as regras de comparação não mudam.

## 5. Gravar os textos e ligar o ícone "i"
- Gravar os textos aprovados da lista corrigida e mostrar o ícone "i" nos títulos dos blocos e colunas, como no plano da Parte B (o que é, como é contado, de onde vem, avisos quando houver, e os filtros em vigor).
- Ficam de fora por enquanto: Usuário do sistema, Bot e Conversas por atendente, que ficam sem ícone até a sua resposta.

## Conferência
- Testes da troca de títulos e dos textos (cada bloco ou coluna aprovada tem o texto; os três que aguardam não têm).
- Conferência na tela em 390, 834 e 1440 nos dois temas. Não publicar.

## Detalhes técnicos
- Itens 1 e 2: consultas só de leitura em `elora_mensagens_espelho`, `elora_atendimentos_espelho` e na lista de usuários da conta pela API (a chave segue só no servidor).
- Item 4: só nos rótulos de exibição (`campos-elora.ts`, `graficos.ts`, `cartoes-graficos.tsx`, `resultados-cliente.tsx`, `indicadores-motor.ts`); as chaves continuam iguais.
- Item 5: dicionário único de textos num arquivo de regras puras, lido pelo ícone; blocos novos do construtor usam o modelo automático.
