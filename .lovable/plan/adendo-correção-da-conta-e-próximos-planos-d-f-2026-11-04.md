# Adendo — correção da Conta e próximos planos D/F

## Item 1 entregue

- A linha Contatos da página Conta passa a mostrar a franquia do plano mais ajustes adicionais explícitos de contatos, sem somar o uso inicial gravado no Setup.
- Dr. Ricardo Assumpção (`8c0ojhr2`): Rabbit Essencial inclui **5.000 contatos**. A correção retorna **5.000**, não 500.
- Nenhum dado foi alterado; `contatos_ativos` continua 500. Receitas, excedentes, lançamentos e fechamentos não foram modificados.
- **Origem do histórico:** existe o movimento `wo78by3d`, tipo `setup`, em **20/09/2026**, observação “Setup inicial”, com `contatos_ativos = 500`. O histórico da Conta transforma qualquer número positivo em “+n”, inclusive valores absolutos do Setup; por isso mostra “Contatos: +500”. A criação de cliente copia esse campo do cadastro para o movimento. O registro comprova o valor salvo, mas não permite concluir se 500 foi digitado ou veio de um padrão antigo. Nada foi corrigido retroativamente.
- **Cadastro interno ainda exibe 500** na informação “Contatos / MAU” e na descrição do Setup, pois lê o uso salvo; o bloco “Pacote atual” já mostra o maior entre cadastro e plano, portanto 5.000. O formulário atual começa em zero e preenche a franquia ao escolher um plano; há fallback legado de 500 no mapeamento de registros nulos. Não alterado, aguardando sua decisão.
- **Verificação:** 17 testes passaram, incluindo quatro da regra de limite e testes financeiros existentes; aplicativo compilou sem erros. Conferência logada da Conta indisponível neste projeto com Supabase externo; o valor foi validado com os registros reais lidos e os testes, não pela tela autenticada.
- Não publicado. Nenhum código dos itens 2 e 3 foi apagado nesta rodada.

## Consulta dos filtros salvos — dados preservados

A consulta encontrou somente **Dr. Gean Brustolin (`jvu3dzqk`)**, com sete etiquetas salvas:

```text
25b44623-a661-44f6-a15f-62e0de0ac761
adcff729-23d6-4bf9-a1ff-9cf140535bae
c0f9f0db-48f2-4669-bdf5-ea42bd32661e
9115288f-58b3-44e7-adb0-921a3597da83
612309ce-9c40-419d-a705-7ea80792c2c5
2f1f250f-58b6-4d1b-b47f-376be78b89c4
7cab868e-14f6-4189-b921-6d237a0eb276
```

Usuários e etapas estão vazios; campo personalizado e campanha não estão preenchidos. Esses são os identificadores armazenados; os nomes das etiquetas não estão nesse registro. Reconsultar antes de executar F e apresentar mudanças, se houver. Não apagar os valores nem alterar silenciosamente filtros de gráficos existentes.

## Etapa D — Campos do Elora (não executada)

- Esconder “Estrutura e campos”, inclusive pelo endereço antigo, sem botão desativado ou aviso, e substituir pela tela Campos do Elora quando D estiver pronta.
- Ler automaticamente painéis, etapas e campos personalizados já disponíveis na conta; não perguntar o que sincronizar nem repetir cadastros manuais.
- Todos os campos antigos e novos começam com Mostrar ligado. Desligar só oculta da exibição; payload e sincronização permanecem completos.
- Dependência: B traz contatos e atendimentos completos, todos os status, colunas principais e reprocessamento dos últimos três dias; mensagens ficam fora. A sincronização completa deve valer desde B, sem aguardar a interface D.
- **Apagar:** aba e renderização antigas, seletor manual de fonte, tabela antiga com “Mostrar (em breve)”, estado e ações exclusivos dessa tela; coleta de campos usados em widgets para limitar a sincronização e extração seletiva correspondente. Retirar somente dependências sem outros consumidores.
- **Reaproveitar, não apagar:** leituras de painéis, campos do painel, campos personalizados e sequências, seus dados existentes e autorização. As informações alimentam o catálogo automático.
- Testar Mostrar ligado por padrão para novos e antigos e confirmar que ocultar um campo não remove seu valor sincronizado.

## Etapa F — filtro único (não executada)

- Substituir o formulário fixo por **+ Filtro** no topo da visão e em cada gráfico.
- Fluxo: **Filtrar por quê? → campo → operador → valor → escopo**. O catálogo inclui contatos, conversas, cards e relatório diário, com data, texto, número, lista, etiqueta, canal, atendente, UTM, campos personalizados, painel e etapa.
- Valores sugeridos vêm dos dados do próprio cliente. Escopo: visão inteira ou gráficos escolhidos; filtro do gráfico fica vinculado a ele.
- **Apagar:** seção “Listas e filtros padrão da conta”, controles fixos Usuários/Etiquetas/Campo personalizado/Valor/Painel/Campanha/Etapas e botão Salvar filtros; estados `fUsuarios`, `fEtiquetas`, `fEtapas`, `fCampoChave`, `fCampoValor`, `fCampanha`, estado de salvamento e ação exclusiva `salvarFiltros`; carregamentos/imports exclusivos e função de gravação antiga quando não houver consumidores.
- **Preservar:** valores já salvos, leituras de usuários/etiquetas/painéis usadas pelo catálogo e filtros dos gráficos existentes. Não excluir colunas nem registros. Não usar os filtros para restringir sincronização.
- Testar operadores por tipo, sugestões isoladas por cliente e escopo visão/gráficos, sem modificar o relatório atual do n8n.

## Limite desta rodada

Parar aqui para conferência. D e F continuam aguardando execução em suas etapas, após as dependências de dados e sua aprovação; sem avanço automático.

## Detalhes técnicos

- Correção isolada em `getPainelCliente`, mantendo o RPC autorizado `painel_cliente_dados` e `requireSupabaseAuth`. Regra pura de exibição em `src/lib/contatos-contratados.ts`, sem leitura de custo ou gravação.
- D: `src/lib/dados-elora.ts`, `src/components/configurar-api-cliente.tsx` (bloco Estrutura e campos, `fonte`, `selecionarFonte`, `camposPainel` e derivados exclusivos), `src/lib/integracao-elora.functions.ts` (`chavesUsadas` e laço seletivo), referências exclusivamente seletivas de `camposUsados` no construtor.
- F: `src/components/configurar-api-cliente.tsx` (bloco final, estados e ação de filtros fixos), `src/lib/integracao-elora.functions.ts` (`salvarFiltrosCliente`, após conferir consumidores). Leituras reutilizáveis: `listarPaineisCliente`, `listarCamposDoPainel`, `listarCamposPersonalizados`, `listarSequenciasCliente`, `listarUsuariosCliente`, `listarEtiquetasCliente`.