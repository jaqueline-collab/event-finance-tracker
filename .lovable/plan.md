# Agendamentos e Calendário — ajustes (sem publicar)

Tudo genérico para qualquer cliente; nenhuma regra fixa do Dr. Ricardo no código.

## Parte A — executar agora (itens 1 a 10)

**Calendário**
1. Cada dia mostra o nome do contato de até 3 compromissos e "+N" para o restante.
2. Consulta em amarelo da marca com texto marinho; procedimento em verde (token de sucesso). Só tokens do tema.
3. O seletor de campo de data vira o filtro Consultas / Procedimentos / Todos (padrão Todos, as duas cores juntas). Quem vê troca sem gravar.
4. O bloco aceita redimensionar largura e altura como os outros; as células crescem junto.
5. Clicar no dia abre a lista: hora, nome, tipo (com cor), telefone, procedimento de interesse e valor. Dia vazio mostra "Nenhum compromisso neste dia".

**Tabela de itens e blocos (inclui exportar)**
6. Datas como 06/11/2026 11:30; cabeçalhos em português corrido ("Data da consulta").
7. Valores como R$ 10.990,00.
8. Telefone como (55) 41 99999-0000; número fora do padrão aparece o melhor possível, sem inventar dígito.
9. URLs viram links que abrem em nova aba, texto cortado e endereço completo ao passar o mouse.
10. Canal nunca mostra o código da instância. Usa o apelido que já existe por canal na tela Conexão e canais (só super admin edita, vazio por padrão). Sem apelido: "Canal sem nome". Vale para tabela, pizza por canal, filtros e Matriz.

## Parte B — leituras estimadas (item 11): só diagnóstico, nada muda

Primeiro passo da execução, somente leitura, para 14/10 a 12/11:
- Tabela atual x só leitura exata para Consulta Agendada, Consulta Agendada ADS, Procedimento Vendido, Novos leads, Conversas e cada coluna da Matriz.
- Confirmação de que Calendário e tabela de itens não mudam (usam a data do próprio card).
- Proposta para dias sem histórico exato: célula com traço "—" e aviso "Sem histórico exato antes de DD/MM" (nunca zero), totais do período marcados como parciais.

Mostro esse quadro no relatório e aguardo sua decisão antes de mexer em qualquer número ou remover a marca de estimado.

## Testes e conferência
- Testes novos: formato de data, valor, telefone, link, "Canal sem nome"/apelido, cores por tipo e filtro Todos.
- Rodar todos os testes; conferir em 390, 834 e 1440 nos temas claro e escuro (telas logadas dependem do acesso ao banco externo, como antes).
- Não publicar.

## Detalhes técnicos
- Formatadores puros novos em `src/lib/formatos.ts` (data, moeda, telefone, URL), usados por `cartoes-graficos.tsx`, tabela de itens e exportação.
- Filtro de tipo do Calendário como opção de visualização do cartão em `graficos.ts` (troca do visitante não grava), seguindo a regra existente.
- Nome do canal por um helper único lendo o apelido da configuração de canais, para todos os blocos e a Matriz.
- Diagnóstico do item 11 roda o motor com estimativas desligadas só em memória, sem gravar.
