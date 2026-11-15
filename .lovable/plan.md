# Plano: sem estimativa, otimização final, Agenda por hora, Funil novo

Regra geral: antes de qualquer gravação, tiro um retrato novo de todos os números (14/10–12/11 e 22/09–03/10). Depois de cada etapa comparo. Qualquer diferença não prevista: paro e mostro, sem gravar. Nada é publicado.

## 1) Sem leitura estimada
- Remover cálculo, marca (componente de estimativa), ponto, tooltip e textos "estimado" do painel, Matriz, gráficos e respostas da assistente Elora.
- Matriz: colunas que dependem de evento do card mostram "—" nos dias sem leitura exata (antes de 05/11), nunca número inferido nem zero, com aviso "Sem histórico exato antes de 05/11".
- "Consultas agendadas" e "Procedimentos vendidos": contar pela data gravada no card, com soma de valores.
- Mudanças esperadas (vou mostrar em tabela antes/depois para você aprovar): só as colunas de evento do card antes de 05/11 e esses dois blocos. Novos leads e Conversas precisam ficar idênticos; se mudarem, paro.
- Verificar na API do Elora se há histórico exato dos cards (mudanças de etapa/campos com data). Se houver: mostro como preencher o passado com dado real (carga única, com backup), sem executar até você aprovar.

## 2) Otimização final
- Novos contatos e ADS contados por função SQL no banco; comparar com o retrato (deve dar 0 diferenças).
- Lista de campos continua como filtro, em cache por cliente, com versão de sincronização e de configuração na chave.
- Meta: toda visão abaixo de 3 s sem cache. Relatório com tempos antes/depois.

## 3) Agenda por hora
- Alternar "Lista / Dia / Semana" no bloco Agenda (sem salvar a escolha).
- Dia: faixas horizontais por hora; compromisso de 11:30 fica entre as linhas de 11h e 12h; horários iguais lado a lado.
- Semana: mesma régua, uma coluna por dia.
- Consulta em amarelo, procedimento em verde (tokens da marca, texto com contraste AA). Clicar abre os detalhes já existentes.
- Faixa de horas vai da primeira à última hora com compromisso no período.

## 4) Funil estilo Elora App
- Faixas trapezoidais empilhadas e centradas, mesma altura; nome da etapa pequeno e valor grande em negrito dentro da faixa.
- Painel à direita com a conversão final em destaque (e conversões entre etapas).
- Paleta de gráficos da marca, contraste AA, nome longo cortado com tooltip, sem sobreposição. Vale para Etapas e Ranking. Só desenho: números do funil não mudam.

## Detalhes técnicos
- Estimativa: `marca-estimativa.tsx`, `cartoes-graficos.tsx`, `matriz.ts/.server.ts`, `matriz-cliente.tsx`, `indicadores-motor.ts`, `graficos.ts`, `elora-cards.server.ts`, `elora-ia*`; testes atualizados para "—" e data gravada.
- SQL: funções `security definer` só service_role para novos contatos por dia e ADS; índices se o EXPLAIN pedir.
- Cache do catálogo em `elora_calculo_cache` com chave incluindo `elora_versoes_cache`.
- Agenda/Funil: componentes puros em `cartoes-graficos.tsx`, regras de posicionamento em `src/lib/graficos.ts` com testes (posição de 11:30, lado a lado, intervalo de horas).
- Remover scripts temporários ao final.

## Pergunta pendente
A regra salva diz para remover a sincronização seletiva por widgets, mas o código antigo ainda sincroniza só os campos usados. Quer que eu mude isso também, ou mantenho como está?
