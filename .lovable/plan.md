# Área do Parceiro: Histórico e Plano Atual separados, permissão em dois níveis

## Como o "Total mensal da carteira" funciona hoje (resposta)

Hoje é uma **fotografia estática de preço de tabela**, não uma prévia do ciclo. Para cada cliente:

```text
mensalidade = valor mensal do plano atual
            + acompanhamento gravado no cadastro do cliente
            + canais WhatsApp/Instagram/Messenger acima da franquia × preço unitário
            + usuários acima da franquia × preço unitário
            + contatos (MAU) acima da franquia × preço unitário
            + módulos cobrados à parte (IA, ASAAS, Z-API, Transcrição por usuário)

Total mensal da carteira = soma dessas mensalidades
```

- Usa sempre o preço atual do plano e os números atuais do cadastro.
- Ignora o ciclo, o vencimento e o ciclo personalizado.
- Ignora movimentações do ciclo em curso (troca de plano, rateio proporcional, ajuste de acompanhamento).
- Soma todos os clientes da carteira, sem os filtros visuais da tela.

## Parte 3 — o indicador passa a usar o cálculo por ciclo

O card deixa de usar essa fórmula estática e passa a usar a mesma máquina de cálculo do fechamento mensal, que respeita ciclo, vencimento, troca de plano no meio do período e rateio proporcional — em modo somente leitura, simulando o fechamento da competência em curso sem gravar nada.

- Para cada cliente da carteira: valor projetado da competência atual considerando os movimentos já registrados dentro do ciclo.
- Cliente sem movimento no ciclo: valor igual à mensalidade vigente, como hoje.
- Rótulo do card passa a deixar claro que é uma prévia: **"Previsão da próxima fatura"**, com a legenda "competência em curso, atualizada em tempo real".
- Continua somando os clientes ativos da carteira, sujeito aos filtros já existentes na tela (Todos/Ativos/Inativos e o período De/Até).


## Parte 1 — dois botões por cliente

Na tabela de clientes da Área do Parceiro, cada linha passa a ter dois botões no lugar do único atual:

- **Histórico de movimentação** — exatamente o que existe hoje: a lista cronológica de eventos (Setup/Ativação, Upgrade, Downgrade, Alteração de plano, Ajuste de acompanhamento, Alteração de parceiro), com data e descrição. A "Composição cobrada" sai daqui.
- **Plano atual do cliente** — pop-up novo, com o estado atual:
  - Nome do plano.
  - Pacote de recursos vigente: canais WhatsApp, Instagram, Messenger, Z-API, usuários, contatos/MAU e os módulos opcionais ativos — o mesmo bloco "Pacote Atual de Recursos" que hoje só existe no cadastro interno.
  - Composição de valores, no nível de detalhe permitido (Parte 2).

## Parte 2 — permissão de visibilidade em dois níveis

O controle do parceiro deixa de ser "mostra ou não mostra valor" e passa a definir o nível de detalhe:

**Com permissão de composição**
- Licença base (linha própria)
- Acompanhamento (linha própria — hoje esse valor não aparece discriminado em lugar nenhum do painel do parceiro)
- Cada excedente e módulo cobrado à parte
- Total

**Sem permissão de composição**
- Total do plano, com licença base e acompanhamento já somados e **não** discriminados entre si
- Todos os excedentes discriminados (usuário, canal, MAU, ASAAS e demais módulos), porque mostram consumo além do contratado, não o preço-base negociado
- Total geral

A mesma regra vale em qualquer lugar do painel que mostre valores, não só na tela nova.

O pacote de recursos (canais, usuários, MAU, módulos) aparece nos dois níveis — não é preço.

## Parte 4 — gráfico anual independente dos filtros do topo

O gráfico "Entradas e saídas / Ativos no mês" deixa de seguir o filtro De/Até do topo. Busca, Todos/Ativos/Inativos e De/Até continuam controlando os cards de resumo e a tabela; só o gráfico sai dessa regra.

- Seletor de ano próprio, acima do gráfico, sempre com as 12 barras de janeiro a dezembro do ano escolhido.
- Lista de anos começa em 2026 e vai até o ano atual; o padrão ao abrir é o ano corrente.
- O alternador entre "Entradas e saídas" e "Ativos no mês" continua funcionando dentro do ano escolhido.

## Parte 5 — três blocos de composição da carteira

Ao lado do card "Previsão da próxima fatura", somando os mesmos clientes já considerados por ele (com os filtros do topo aplicados):

- **Total cobrado pelo sistema** — soma da licença base.
- **Total de acompanhamento** — soma do acompanhamento.
- **Total de excedentes** — canais, usuários e MAU acima da franquia, mais módulos cobrados à parte (ASAAS, Agentes IA, Transcrição, Z-API).

Só aparecem quando o parceiro tem permissão de composição. Sem essa permissão, a tela mostra apenas o card de previsão — nem no cliente individual nem no agregado da carteira há separação entre licença base e acompanhamento.

## Detalhes técnicos


**Servidor (`src/lib/parceiro.functions.ts`)**
- Hoje, quando o parceiro não pode ver valores, a função devolve o painel sem nenhum campo de valor (retorno antecipado). Passa a sempre calcular a composição e devolver dois formatos:
  - `veValores = true`: `itens` completos (licença base, acompanhamento como linha própria, excedentes, módulos) + `total`.
  - `veValores = false`: `totalPlano` (licença base + acompanhamento somados, indivisíveis), `excedentes` (só as linhas de consumo além do contratado e módulos à parte) e `total`.
- A montagem continua vindo de `explicarReceitaCliente`; o acompanhamento, que já é devolvido separado por essa função, passa a virar linha própria de `itens` quando há permissão, e a ser embutido em `totalPlano` quando não há.
- A lista branca de campos por cliente (`clientes.map`) ganha os campos de recurso — canais whats/insta/messenger/zapi, usuários, contatos/MAU, flags de IA/ASAAS/Z-API/Transcrição — e as franquias do plano, para montar o pacote. Nenhum campo de custo, margem, lucro, WTS ou scale discount entra, com ou sem permissão.
- O total da carteira passa a somar `detalharCicloCliente` (`src/lib/calc/receita.ts`) — a mesma função que alimenta o fechamento mensal — para a competência em curso de cada cliente, usando os movimentos já carregados. Nada é gravado: é só leitura, sem criar fechamento nem tocar em `elora_fechamentos`/`elora_financeiro`.
- Com permissão, o mesmo agregado devolve `totalLicenca`, `totalAcompanhamento` e `totalExcedentes`, somados sobre exatamente os mesmos clientes do total geral. Sem permissão, esses três campos não são calculados nem enviados.
- Nenhuma mudança de schema, RLS ou dado financeiro.

**Interface (`src/routes/parceiro.tsx`)**
- Cada linha ganha dois botões com rótulo/ícone distintos; o diálogo atual perde o bloco "Composição cobrada".
- Novo diálogo "Plano atual do cliente" com: cabeçalho com nome do cliente e plano, grade do pacote de recursos (reaproveitando a apresentação do bloco do cadastro interno), badges dos módulos ativos e a composição de valores conforme o nível de permissão.
- Card do total com o novo cálculo e o rótulo "Previsão da próxima fatura", com os três blocos de composição ao lado quando a resposta os incluir.
- Seletor de ano próprio do gráfico, com estado separado dos filtros do topo (ano na URL como parâmetro próprio, sem reaproveitar De/Até), alimentando a série de 12 meses.

## Validação

- "Histórico de movimentação" e "Plano atual do cliente" abertos separadamente em Cirurgiões Staffs - Fischer, cada um mostrando só o seu conteúdo.
- Um parceiro com permissão de composição e outro sem: licença e acompanhamento discriminados no primeiro, só o total no segundo, com os excedentes aparecendo nos dois.
- "Acompanhamento" como linha própria da composição quando a permissão está ligada.
- Cliente sem movimento no ciclo atual: o card bate com a mensalidade vigente.
- Cliente com troca de plano ou ajuste de acompanhamento no ciclo: o card reflete a mudança/proporcionalidade.
- Conferir que a simulação não gera nenhum fechamento nem altera dados existentes.
- Trocar o ano no seletor do gráfico: sempre 12 barras de janeiro a dezembro daquele ano, sem sofrer com o De/Até do topo; mudar o De/Até e confirmar que só tabela e cards reagem.
- Parceiro com permissão: os três blocos aparecem e Licença + Acompanhamento + Excedentes batem com a previsão. Parceiro sem permissão: os blocos não aparecem em nenhuma hipótese.
- Celular, tablet e computador, temas claro e escuro.
- Testes e verificação de tipos rodando limpos; nenhum dado financeiro alterado.
