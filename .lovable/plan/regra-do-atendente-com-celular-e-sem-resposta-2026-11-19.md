# Regra do atendente com "celular" e "sem resposta"

## Regra
Para cada conversa do dia (e cada atendimento):
1. Atendente = última pessoa da equipe **com nome** que respondeu naquele dia (suporte ignorado; resposta pelo celular, sem identificação, ignorada quando alguém com nome respondeu).
2. Se só houve resposta pelo celular: **"Respondida pelo celular (sem identificação)"**.
3. Se ninguém da equipe respondeu: **"Sem resposta da equipe"** (substitui "Sem informação" só nesta dimensão).
Os dois nomes novos aparecem só na dimensão de atendente. Totais de conversas e atendimentos não mudam.

## Passos
1. **Retrato antes**: Conversas por atendente do Dr. Ricardo em 22/09 a 03/10 e 14/10 a 12/11 (totais, cada atendente, "Sem informação").
2. **Banco**: as funções que acham a última resposta humana (por dia e por atendimento) passam a devolver duas coisas: a última pessoa com nome e, separadamente, se houve resposta pelo celular. Hoje o id do celular é descartado; ele passa a ser lido só como marca.
3. **Servidor**: um único lugar decide o rótulo (pessoa > celular > sem resposta), usado pela Matriz, pelo painel visual, pelo construtor de gráficos, pelo link incorporado e pelo catálogo de campos. Cache renovado (nova versão) para nenhum número antigo sobrar.
4. **Texto do "i"** de Atendente e Conversas por atendente atualizado com os dois nomes (libera os textos pendentes de Usuário do sistema/Bot/Conversas por atendente só se você aprovar).
5. **Testes**: pessoa com nome vence o celular no mesmo dia; só celular vira o rótulo do celular; nenhuma resposta vira "Sem resposta da equipe"; suporte ignorado; soma por atendente = total.
6. **Retrato depois** nos dois períodos, com totais, cada atendente e as duas linhas novas, comparado ao antes. Confirmar que os totais são idênticos.

Não publicar.

## Detalhes técnicos
- `elora_conversas_pares` e `elora_ultimo_humano_sessao`: novo campo `celular boolean` (houve mensagem TO_HUB humana com user zero-UUID), mantendo a exclusão do zero-UUID na escolha da pessoa.
- Rótulos como constantes em `src/lib/nao-definido.ts` (ou vizinho), aplicados só em `atendente` em `indicadores-motor.ts`, `painel-visual.ts/.server.ts`, `campos-elora.server.ts`, `elora-espelho.server.ts`.
- Sufixo de cache `atendente-v3` em `cartao-calculo.server.ts` e `campos-elora.server.ts`.
- AGENTS.md: regra de atendente atualizada.
