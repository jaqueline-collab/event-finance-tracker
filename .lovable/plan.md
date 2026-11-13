# Correções nas visões Resultados, Agenda e Matriz (sem publicar)

## Levantamento: o que aparece fora dos blocos da visão

Exceto barra de período, "+ Filtro", aviso de atualização e abas:

| Visão | O que aparece fora dos blocos | Onde está no código |
|---|---|---|
| Agenda (e qualquer visão sem cartões `kpi-*`) | Os 4 cartões fixos do topo (Novos leads, Conversas, TMR · TMA, Leads de ADS) | `src/components/painel-visual.tsx:224` renderiza `<Indicadores>` (definido em ~linha 300–320) quando `kpisNaGrade` é falso; o valor vem de `src/routes/area-do-cliente.index.tsx:566` |
| Todas as visões do painel | Texto "parcial · cobertura diária não confirmada" | `painel-visual.tsx:225` |
| Todos os blocos | O mesmo texto repetido em cada bloco | `src/components/cartoes-graficos.tsx:304` |
| Resultados | Nada além do acima: os 4 indicadores já são blocos `kpi-*`, então o cabeçalho fixo some | — |
| Matriz | Só a tabela da Matriz (é a própria visão fixa, não tem blocos). Nenhum cartão de número fora dela | `area-do-cliente.index.tsx:330` |

Confirmo antes de mudar o código, com uma leitura final do arquivo de cada visão.

## O que muda

1. **Cartões fixos da Agenda saem.** O componente `Indicadores` e a opção `kpisNaGrade` são apagados do painel. A Agenda passa a ter os indicadores como blocos comuns da visão, iguais aos de Resultados (arrastar, redimensionar, remover, editar). Uma gravação acrescenta esses blocos só às visões que hoje mostram o cabeçalho fixo, com o estado anterior guardado para desfazer. Nada vale só para um cliente.
2. **TMR e TMA viram dois blocos.** `kpi-tmr` passa a ser só TMR, e é criado o `kpi-tma`. Cada um tem valor, variação e "N conversas medidas". As visões com o bloco antigo "TMR · TMA" recebem os dois blocos no mesmo lugar, com o estado anterior guardado.
3. **Variação legível.** Melhorou usa o token de sucesso, piorou usa o de alerta ou destrutivo, sem dado usa o neutro. Se precisar, ajusto os tokens em `styles.css` para contraste AA nos dois temas. O teste de cores da marca continua valendo.
4. **Funil novo.** Uma linha por etapa: nome à esquerda (cortado, com o nome completo ao passar o mouse), barra do tamanho do valor, e valor + % à direita. Mostra as 8 maiores e junta o resto em "Outras". Nenhum texto em cima do desenho. Clicar na linha continua filtrando.
5. **Aviso de cobertura uma vez só.** Uma única linha no topo da visão. Nos blocos, só um ponto discreto com explicação ao passar o mouse, e só quando o bloco depende de um dia sem cobertura.
6. **Calendário.** O título padrão de um calendário novo vira "Agendamentos", editável como os outros. Dia futuro fica vazio. Dia passado sem registro fica vazio ou com um 0 discreto. Dia sem cobertura mostra o mesmo ponto do item 5, sem escrever "aguardando".

## Testes

- Falha se alguma visão mostrar cartão de número fora de `elora_dashboard_visoes` (o painel não pode mais renderizar `Indicadores`).
- TMR e TMA têm o mesmo valor do cálculo de antes, cada um no seu bloco.
- Funil: 8 maiores + "Outras" com a soma certa, e a soma total igual à de antes.
- Calendário: dia futuro vazio, dia sem cobertura marcado, título padrão "Agendamentos".
- Os testes que já existem continuam passando, inclusive o de cores da marca.

## Conferência

390, 834 e 1440, tema claro e escuro, na parte sem login. A prova de que cada visão só mostra os blocos dela vem do código: indico arquivo e linha depois da mudança. Não publico.

## Detalhes técnicos

- Arquivos: `painel-visual.tsx`, `area-do-cliente.index.tsx`, `cartoes-graficos.tsx` (funil, calendário, variação, ponto de cobertura), `graficos.ts` (`CARTOES_KPI`, `cartaoDoPainel`, `novoCartao` com o título por tipo), `dashboard-visoes.server.ts` (visões novas).
- Gravação de dados: só acrescenta ou divide blocos em `filtros.cartoes`, com o estado anterior registrado em `elora_config_acoes`. Nada é apagado.
