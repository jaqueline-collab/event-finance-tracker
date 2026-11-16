# Incluir "Rabbit Agencia" em Usuários de suporte

## O que muda
- "Rabbit Agencia" entra na lista global de Usuários de suporte, com a mesma regra da Jaqueline Ditós.
- Ela sai das listas de atendente, dos filtros, das tabelas, do exportar e da Elora IA.
- A conversa continua contando nos totais. O atendente passa a aparecer em "Sem informação" (agrupamentos) ou em branco (células).
- Se a conversa teve antes uma resposta humana de alguém que não é suporte, o atendente passa a ser essa pessoa (regra da resposta anterior que já existe).
- Nada mais é alterado. Nada é publicado.

## Passos
1. **Retrato antes:** Resultados, Resultados (novo), Agenda, Agendamentos e a Matriz inteira, de 14/10 a 12/11 e de 22/09 a 03/10.
2. **Buscar o e-mail e o telefone** de "Rabbit Agencia" nos dados da conta do Dr. Ricardo (lista de usuários e atendimentos). Se existirem, eles entram junto com o nome. Se não existirem, aviso e cadastro só pelo nome.
3. **Incluir na lista** (um registro novo; a estrutura já existe, então não há mudança de código).
4. **Invalidar o cache** para nenhum número antigo aparecer.
5. **Retrato depois e comparação:**
   - quantas conversas mudam de atendente (o esperado é cerca de 7), separando quantas vão para outra pessoa pela resposta anterior e quantas vão para "Sem informação";
   - confirmação de que o total de conversas não muda em nenhum dia;
   - se aparecer alguma diferença fora disso, eu paro e mostro antes de seguir.
6. Rodar os testes existentes.

## Detalhes técnicos
- Inserir a linha em `elora_suporte_interno` (nome, e-mail e telefone, se encontrados em `elora_apoio_espelho`/`elora_atendimentos_espelho`).
- Os dados mudam pela chave de configuração em `elora_versoes_cache`; confirmar que a inclusão muda a versão. Se não mudar, limpar `elora_calculo_cache` só do cliente afetado.
- Retratos salvos em `/mnt/documents/desempenho/retrato-antes-rabbit.json` e `retrato-depois-rabbit.json`.
