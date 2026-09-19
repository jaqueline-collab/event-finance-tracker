# Área do Parceiro: Histórico e Plano Atual separados, permissão em dois níveis

## Parte 3 — resposta primeiro: como o "Total mensal da carteira" funciona hoje

Confirmado, sem alterar nada: **é uma fotografia estática de preço de tabela de hoje**, não uma prévia do ciclo.

A fórmula atual é, para cada cliente da carteira do parceiro:

```text
mensalidade = valor mensal do plano atual
            + acompanhamento gravado no cadastro do cliente
            + canais WhatsApp/Instagram/Messenger acima da franquia × preço unitário
            + usuários acima da franquia × preço unitário
            + contatos (MAU) acima da franquia × preço unitário
            + módulos cobrados à parte (IA, ASAAS, Z-API, Transcrição por usuário)

Total mensal da carteira = soma dessas mensalidades
```

Características importantes:

- Usa **sempre o preço atual do plano** e os números atuais do cadastro do cliente (canais, usuários, MAU). Se o preço do plano mudar hoje, o número muda hoje.
- **Não olha o ciclo**: ignora em que dia da competência estamos, data de vencimento e ciclo personalizado.
- **Não olha movimentações do ciclo em curso**: troca de plano no meio do mês, cobrança proporcional e ajustes de acompanhamento feitos durante a competência não entram — só o estado final do cadastro entra.
- **Não usa consumo incremental acumulado**: o excedente é calculado sobre o número que está no cadastro agora, não sobre o que foi consumido ao longo do mês.
- Soma **todos os clientes da carteira**, sem filtrar por status na conta (o filtro da tela é só visual).

O que você quer (prévia real da fatura que vai fechar, com proporcionalidade e movimentações do ciclo) é diferente disso. O sistema **já tem** a máquina de cálculo por ciclo — a mesma usada no fechamento mensal, que respeita ciclo, troca de plano no meio do período e rateio proporcional —, ela simplesmente não é usada nesse indicador. Trocar o cálculo do indicador por essa máquina é viável, mas fica para uma etapa seguinte, depois da sua confirmação.

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

## Detalhes técnicos

**Servidor (`src/lib/parceiro.functions.ts`)**
- Hoje, quando o parceiro não pode ver valores, a função devolve o painel sem nenhum campo de valor (retorno antecipado). Passa a sempre calcular a composição e devolver dois formatos:
  - `veValores = true`: `itens` completos (licença base, acompanhamento como linha própria, excedentes, módulos) + `total`.
  - `veValores = false`: `totalPlano` (licença base + acompanhamento somados, indivisíveis), `excedentes` (só as linhas de consumo além do contratado e módulos à parte) e `total`.
- A montagem continua vindo de `explicarReceitaCliente`; o acompanhamento, que já é devolvido separado por essa função, passa a virar linha própria de `itens` quando há permissão, e a ser embutido em `totalPlano` quando não há.
- A lista branca de campos por cliente (`clientes.map`) ganha os campos de recurso — canais whats/insta/messenger/zapi, usuários, contatos/MAU, flags de IA/ASAAS/Z-API/Transcrição — e as franquias do plano, para montar o pacote. Nenhum campo de custo, margem, lucro, WTS ou scale discount entra, com ou sem permissão.
- Nenhuma mudança de schema, RLS ou dado financeiro.

**Interface (`src/routes/parceiro.tsx`)**
- Cada linha ganha dois botões com rótulo/ícone distintos; o diálogo atual perde o bloco "Composição cobrada".
- Novo diálogo "Plano atual do cliente" com: cabeçalho com nome do cliente e plano, grade do pacote de recursos (reaproveitando a apresentação do bloco do cadastro interno), badges dos módulos ativos e a composição de valores conforme o nível de permissão.
- Sem alteração no indicador "Total mensal da carteira" nesta etapa.

## Validação

- "Histórico de movimentação" e "Plano atual do cliente" abertos separadamente em Cirurgiões Staffs - Fischer, cada um mostrando só o seu conteúdo.
- Um parceiro com permissão de composição e outro sem: licença e acompanhamento discriminados no primeiro, só o total no segundo, com os excedentes aparecendo nos dois.
- "Acompanhamento" como linha própria da composição quando a permissão está ligada.
- Celular, tablet e computador, temas claro e escuro.
- Testes e verificação de tipos rodando limpos; nenhum dado financeiro alterado.
