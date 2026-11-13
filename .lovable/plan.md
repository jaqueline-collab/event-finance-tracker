# Ajustes no Calendário (vistos em tela real) — junto com A a D

Observação: o texto dos itens A a D não chegou nesta mensagem nem está salvo no plano atual. Assim que for colado, entra aqui sem mudar os 3 itens abaixo. Item C continua com conferência antes de gravar.

## 1. Lista do dia
- A coluna de data de cada linha passa a mostrar a data e hora do próprio compromisso (Consulta → Data da consulta; Procedimento → Data do procedimento). Nunca mais "Não definido" para a data que colocou o item naquele dia.
- Cada linha mostra também Procedimento de interesse (card) e Valor do card, formatados (R$ com centavos).
- Remover repetições: a data do compromisso aparece uma vez (junto à hora), sem repetir a outra data como campo extra quando vazia.
- Layout da lista quebra linha em vez de cortar à direita (390/834/1440).

## 2. Contraste no tema escuro
- Consulta: fundo amarelo da marca com texto marinho nos dois temas.
- Procedimento: fundo verde com texto claro nos dois temas.
- Ajustar tokens em styles.css (sem hex em componentes) e incluir verificação de contraste AA no teste de branding.

## 3. Título do bloco da Agenda
- O bloco "Novo gráfico" (tabela Nome, Data da consulta, Data do procedimento, Valor, Origem) passa a se chamar "Itens agendados". Gravação na visão Agenda registrada em elora_config_acoes (desfazer). Nenhum bloco removido.

## Testes
- Teste com formatos reais do espelho: telefone com barra, data com 7 casas decimais, procedimento cuja única data é a do procedimento (deve exibir data/hora, não "Não definido").
- Rodar todos os testes; conferir 390/834/1440 claro/escuro onde for possível abrir.

Não publicar.

## Detalhes técnicos
- `itensDoDia`/`eventosCalendario` em `src/lib/graficos.ts`: preencher data do compromisso a partir do campo de data do tipo; adicionar procedimento-34 e valor do card como campos padrão da lista quando existirem no catálogo (genérico, sem cliente fixo).
- `COR_TIPO_CALENDARIO` em `cartoes-graficos.tsx` usa `bg-brand text-brand-foreground` / `bg-success text-success-foreground`; corrigir os valores escuros desses tokens.
