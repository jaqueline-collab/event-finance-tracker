# Painel da Dra. Nathalia Morato (cliente sfwsf3t7)

## O que encontrei
- **Não há chave do Elora App cadastrada para esse cliente.** Por isso ainda não há nada sincronizado (0 contatos, 0 atendimentos, 0 cards) e nenhuma conferência foi feita.
- **Há dois clientes com o mesmo nome "Dra. Nathalia Morato":** `wu1y5iv2`, criado em 01/09, e `sfwsf3t7`, criado em 09/11. Os dois estão vazios. Vou usar só o `sfwsf3t7`, como você pediu, e não mexo no outro.
- **Pendência anterior:** a correção da conferência automática (retomar, gravar o avanço a cada pedido, cards em lote) já está no código e os testes passam. Ainda falta marcar as 3 conferências travadas de 19/11 como "interrompidas" e trazer a prova das 3 rodadas, com o campo de exclusões. Faço isso primeiro.

## Etapas
1. **Terminar a conferência automática do Dr. Ricardo**, como no plano aprovado: marcar as 3 conferências travadas, rodar até concluir e trazer as rodadas, o id, as linhas dos 7 dias e as exclusões.
2. **Assim que a chave do Elora da Dra. Nathalia estiver cadastrada:** fazer a sincronização completa (apoio, contatos, atendimentos, cards e mensagens) até todas as fontes concluírem. Depois, rodar a conferência com o Elora e trazer a tabela.
3. **Levantamento (só leitura)**, entregue no chat:
   - campos personalizados de contato;
   - classificações de conversa;
   - etiquetas;
   - o campo Origem, com cada valor e a quantidade de contatos (vazio aparece como "Sem informação").
4. **Configuração por cliente "Patrocinado"**, nova e genérica, guardada junto com as outras configurações do cliente e editável só pela super admin. Ela diz qual campo é a origem e, para cada valor, se é patrocinado ou não. Para a Dra. Nathalia, começa com a sua proposta: patrocinado = Instagram e WhatsApp Meta; não patrocinado = os demais, inclusive "Sem informação". Um valor novo que aparecer depois conta como não patrocinado até alguém classificar.
5. **Relatório diário dela**, montado com as colunas configuráveis que já existem, sem tabela nova:
   - Contatos novos: Total, uma coluna por valor de Origem, Patrocinado e Não patrocinado.
   - Agendamentos: as mesmas colunas, assim que a origem dos agendamentos for definida.
   - Tudo fica como configuração do cliente. Nenhum nome ou valor dela vai para o código, e os testes usam um cliente fictício.
6. **De onde vêm os agendamentos:** como ela não usa funis, depois do levantamento vou indicar qual campo (por exemplo, uma data de consulta), classificação de conversa ou etiqueta marca o agendamento, e em que dia ele conta. Se houver mais de um candidato, mostro os números de cada um e peço para você escolher antes de criar as colunas de Agendamentos.
7. **Conferência:** Patrocinado + Não patrocinado = Total, e a soma das colunas de Origem = Total, em todos os dias. Abrir o Relatório diário dela em 390/834/1440, nos temas claro e escuro.
8. Não publicar.

## O que depende de você
- Cadastrar a chave do Elora App da Dra. Nathalia: na configuração do cliente, aba de conexão.
- Escolher de onde vêm os agendamentos, se o levantamento mostrar mais de uma opção.

## Detalhes técnicos
- A configuração de patrocinado fica em `elora_relatorio_corte_config` (nova coluna jsonb `origem_patrocinado: { campo, patrocinados: string[] }`). Só o servidor lê; só a super admin grava, por `exigirSuperAdmin`.
- Uma função pura em `src/lib` faz a classificação, com testes.
- As colunas são linhas de `elora_indicadores_config`, com uma condição `{fonte:"contato", campo}` igual ao valor, ou dentro da lista de patrocinados. O motor resolve a lista na leitura, então reclassificar não exige recriar as colunas.
- Total = o indicador padrão de contatos novos. As colunas por Origem são geradas a partir dos valores do catálogo `campos-elora`.
