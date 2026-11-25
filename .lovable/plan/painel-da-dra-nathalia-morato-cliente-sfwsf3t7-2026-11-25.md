# Painel da Dra. Nathalia Morato (cliente sfwsf3t7)

## O que encontrei
- **A chave do Elora App do cliente sfwsf3t7 já está cadastrada.** Ainda não há nada sincronizado: 0 contatos, 0 atendimentos e 0 cards.
- O cadastro `wu1y5iv2` é a conta antiga (churn em 19/10) e não será mexido.
- **Pendência anterior:** a correção da conferência automática (retomar, gravar o avanço a cada pedido, cards em lote) já está no código e os testes passam. Ainda falta marcar as 3 conferências travadas de 19/11 como "interrompidas" e trazer a prova das 3 rodadas, com o campo de exclusões. Faço isso primeiro.

## Etapas
1. **Terminar a conferência automática do Dr. Ricardo**, como no plano aprovado: marcar as 3 conferências travadas, rodar até concluir e trazer as rodadas, o id, as linhas dos 7 dias e as exclusões.
2. Fazer a sincronização completa (apoio, contatos, atendimentos, cards e mensagens) até todas as fontes concluírem. Depois, rodar a conferência com o Elora e trazer a tabela.
3. **Levantamento (só leitura)**, entregue no chat:
   - campos personalizados de contato;
   - classificações de conversa;
   - etiquetas;
   - o campo Origem, com cada valor e a quantidade de contatos (vazio aparece como "Sem informação").
4. **Configuração por cliente "Patrocinado"**, nova e genérica, guardada junto com as outras configurações do cliente e editável só pela super admin. Ela diz qual campo é a origem e, para cada valor, se é patrocinado ou não. Para a Dra. Nathalia, começa com a sua proposta: patrocinado = Instagram e WhatsApp Meta; não patrocinado = os demais, inclusive "Sem informação". Um valor novo que aparecer depois conta como não patrocinado até alguém classificar.
5. **Relatório diário dela**, montado com as colunas configuráveis que já existem, sem tabela nova:
   - Contatos novos: Total, uma coluna por valor de Origem, "Sem informação" como coluna própria entre as Origens (contatos sem Origem preenchida), Patrocinado e Não patrocinado.
   - Agendamentos: as mesmas colunas, assim que a origem dos agendamentos for definida.
   - Tudo fica como configuração do cliente. Nenhum nome ou valor dela vai para o código, e os testes usam um cliente fictício.
6. **De onde vêm os agendamentos:** como ela não usa funis, depois do levantamento vou indicar qual campo (por exemplo, uma data de consulta), classificação de conversa ou etiqueta marca o agendamento, e em que dia ele conta. Se houver mais de um candidato, mostro os números de cada um e peço para você escolher antes de criar as colunas de Agendamentos.
7. **Conferência:** Patrocinado + Não patrocinado = Total, e a soma das colunas de Origem = Total, em todos os dias. Abrir o Relatório diário dela em 390/834/1440, nos temas claro e escuro.
8. **Comparação com o fechamento dela:** trazer Contatos novos por Origem de 23/11 e 24/11 (dia de Brasília, à meia-noite) e comparar 24/11 com o informado: total 11, sendo Instagram 1, WhatsApp Meta 6, WhatsApp Orgânico 3, Google 0 e Site 1. Mostrar a diferença em cada coluna e, quando houver, os contatos que explicam essa diferença.
9. Não publicar.

## O que depende de você
- Escolher de onde vêm os agendamentos, se o levantamento mostrar mais de uma opção.

## Detalhes técnicos
- A configuração de patrocinado fica em `elora_relatorio_corte_config` (nova coluna jsonb `origem_patrocinado: { campo, patrocinados: string[] }`). Só o servidor lê; só a super admin grava, por `exigirSuperAdmin`.
- Uma função pura em `src/lib` faz a classificação, com testes.
- As colunas são linhas de `elora_indicadores_config`, com uma condição `{fonte:"contato", campo}` igual ao valor, ou dentro da lista de patrocinados. O motor resolve a lista na leitura, então reclassificar não exige recriar as colunas.
- Total = o indicador padrão de contatos novos. As colunas por Origem são geradas a partir dos valores do catálogo `campos-elora`.
