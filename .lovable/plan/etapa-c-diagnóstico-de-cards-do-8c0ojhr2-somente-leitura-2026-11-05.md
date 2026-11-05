# Etapa C — Diagnóstico de cards do 8c0ojhr2 (somente leitura)

Nada é criado, gravado ou alterado, nem no app nem no Elora. Só chamadas GET, feitas no servidor com a chave do cofre. Nenhuma chave, telefone ou nome completo aparece no resultado.

## O que vou levantar

1. **Painéis e etapas (11 painéis, com atenção ao "Funil de vendas - Vini")**
   - Para cada painel: as etapas com ordem, título e fase (StepPhase).

2. **Contagem de cards**
   - Tabela por painel → etapa → status (OPEN, WON, LOST, ARCHIVED), com o total de cada painel.
   - Leitura paginada até o fim, com todos os status (incluindo os arquivados, se a API aceitar).

3. **Chaves de GET /crm/v2/panel/card**
   - Com IncludeDetails = PanelTitle, StepTitle, StepPhase, ResponsibleUser, Contacts, CustomFields, LostReason.
   - Todas as chaves que voltam, inclusive as aninhadas, com % de preenchimento em cima de todos os cards.
   - Um card de exemplo mascarado: nome e telefone parciais, ids encurtados.
   - Também testo outros IncludeDetails para ver quais a API aceita.

4. **Campos personalizados dos cards**
   - Lista com nome, tipo e % de preenchimento por painel.
   - Destaque para os que parecem data da consulta, procedimento, valor e compareceu.

5. **Histórico e filtros de data**
   - Testo endereços prováveis de histórico, eventos, anotações e atividades do card (ex.: `/crm/v1/panel/card/{id}/history`, `/events`, `/notes`, `/activities`, `/timeline`), e digo qual existe e o que devolve.
   - Testo os filtros CreatedAt, UpdatedAt e StepChangedAt (com sufixos .After/.Before), conferindo se cada um realmente filtra, comparando as contagens.
   - Vejo se o card traz campos de data por etapa (ex.: data da última troca de etapa, data de ganho/perda).

6. **Como saber o dia em que virou "agendado" e "ganho"**
   - Conclusão com base no que existir: histórico de etapas, data de troca de etapa, data de ganho, campo personalizado de data da consulta, ou, se nada disso existir, a alternativa de registrar a mudança nós mesmos a cada sincronização (só descrita, não feita).

## Entrega
Tabelas e conclusões no chat. Depois paro e espero você.

## Detalhes técnicos
- Script temporário em /tmp que lê a credencial via `credenciais.server.ts` e faz só GET, com pausa entre chamadas para respeitar o limite da API.
- Nenhum arquivo do projeto alterado, nenhuma tabela criada, nada publicado.
