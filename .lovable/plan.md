# Plano: espelho completo de cada cliente (todos os campos)

## Situação hoje (Dr. Ricardo)
- O espelho novo já guarda o registro inteiro do Elora (com todos os campos personalizados) para contatos, atendimentos e cards. O que ainda é seletivo é a sincronização antiga ("só os campos usados por widgets"), que grava em `elora_contatos_sincronizados` (419 linhas).
- Tamanho atual: mensagens 71 MB (42 mil), contatos 20 MB (12 mil), atendimentos 15 MB (3,2 mil), cards 9,5 MB (5,5 mil), histórico de cards 8 MB (7,3 mil).
- Carga completa medida: contatos 719 chamadas, mensagens 4.338, cards 1.360, atendimentos 47.

## O que fazer
1. Desligar a extração seletiva: a sincronização antiga passa a gravar todos os campos personalizados de cada contato (sem olhar widgets).
2. Garantir que contatos, atendimentos e cards sempre guardem todos os campos, também na leitura incremental.
3. Os blocos antigos (widgets) passam a ler os campos do espelho completo; nada muda nos números (retrato antes e depois, parar se mudar).
4. Limpeza: `elora_contatos_sincronizados` fica só leitura até confirmar 0 diferenças; depois deixa de ser gravada (sem apagar).

## Impacto estimado
- Tempo de sincronização: a carga completa não muda de número de chamadas (a API já devolve todos os campos na mesma página). A incremental de hora em hora continua em segundos. Só a primeira regravação da sincronização antiga leva uma rodada extra (~12 mil contatos, ~120 páginas, ~2–4 min).
- Carga do banco: + ~5–10 MB por cliente do porte do Dr. Ricardo (campos que hoje ficam fora da tabela antiga). Sem novas tabelas; índices atuais bastam.
- Abertura das visões: sem mudança no painel novo (já lê o espelho completo). Os blocos antigos ganham os campos sem nova leitura.

## Detalhes técnicos
- `sincronizarIntegracaoCliente` (`integracao-elora.functions.ts`): remover o filtro `chavesUsadas`; gravar `customFields` inteiro.
- Medir antes/depois: tempo da carga, chamadas, tamanho das tabelas (`pg_total_relation_size`) e tempo de abertura das 5 visões.
- Regra de memória "remover sincronização seletiva" passa a ser cumprida.
