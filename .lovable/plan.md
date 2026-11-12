# Etapas D e F: Campos do Elora e botão "+ Filtro"

Uma entrega em duas partes, nesta ordem: D (catálogo) com testes, depois F (filtro) com testes. Não publicar.

## O que já existe e será reaproveitado
- Catálogo do motor de indicadores (agrupado por Card, Contato, Atendimento, UTM) usado no editor de colunas da Matriz: vira o catálogo único, ampliado.
- Seletor agrupado por fonte do editor de colunas: reaproveitado no "+ Filtro".
- Chips de canal, atendente e equipe da Matriz e do painel visual: deixam de ser controle separado e passam a ser filtros do "+ Filtro".
- Painel lateral Configurar (Conexão, Canais, Painel do cliente): ganha a aba "Campos do Elora".

## D. Campos do Elora
- Catálogo por cliente montado a partir do espelho já sincronizado: Contato (nome, telefone, canal, etiquetas, origem, UTMs, personalizados), Atendimento (data, canal, atendente, equipe, classificação, tempos), Card (painel, etapa, valores, datas, personalizados) e UTM.
- Cada campo: fonte, nome original, tipo (texto, número, data, lista, sim/não, moeda, deduzido dos valores e da definição do Elora), uso como filtro, coluna ou gráfico.
- A cada sincronização, campos novos entram e removidos saem do catálogo; dados já gravados ficam intactos.
- Super admin e equipe interna, por cliente: renomear rótulo e ocultar campo. Padrão: tudo visível, nome original. Cliente sem cards ou classificação simplesmente não tem esses grupos.
- Aba nova "Campos do Elora" em Configurar, com busca e grupos por fonte; nunca visível ao cliente.
- Editor de colunas da Matriz passa a ler só esse catálogo (com rótulos e ocultos aplicados).

## F. Botão "+ Filtro"
- Um único botão por visão (Matriz e painel visual): escolhe o campo (grupos por fonte, com busca), depois operador conforme tipo: data = período; lista = uma ou mais opções com valores reais do cliente; texto = contém; número = maior, menor, entre; todos = vazio / preenchido.
- Filtros aparecem como chips removíveis; a visão recalcula ao aplicar. "Não definido" é filtrável.
- Canal, atendente e equipe viram filtros comuns desse botão.
- Filtros padrão da visão: só super admin salva. Cliente aplica filtros só para si, na sessão, sem gravar nada.
- Campo de outra fonte (ex.: campo do card numa visão de atendimentos): uma linha avisa "ligado pelo contato"; o cálculo filtra por existência (mantém ou tira o contato), nunca junta linhas, então nada duplica.

## Regras de dados
- Tudo por cliente_id; tabela nova de ajustes do catálogo (rótulo e oculto por campo) com RLS ligado e sem policy, lida e gravada só por funções de servidor que conferem o acesso (escrita: super admin / equipe interna).
- Filtros padrão gravados na configuração da visão já existente, escrita só super admin.
- Texto das mensagens nunca é lido. Painel do Dr. Gean (fonte antiga) não muda.

## Testes
- Cliente sem cards e sem classificação: catálogo e telas só com o que existe, sem erro.
- Dois clientes com personalizados diferentes: catálogos diferentes.
- Campo removido no Elora sai do catálogo; dados antigos continuam.
- Não super admin não edita o catálogo nem filtros padrão (teste no servidor).
- Filtro por campo de outra fonte não duplica linhas (totais conferidos).
- Painel do Gean igual ao de antes.

## Conferência final
Telas em 390, 834 e 1440, temas claro e escuro; lista do que mudou e do que saiu (chips separados, catálogo antigo do editor). Parar sem publicar.

## Detalhes técnicos
- Catálogo puro em `src/lib/campos-elora.ts` (montagem, tipos, aplicação de ajustes); leitura do espelho em `campos-elora.server.ts`; funções em `campos-elora.functions.ts` com `exigirSuperAdmin`/equipe interna.
- Tabela `elora_campos_ajustes (cliente_id, fonte, campo, rotulo, oculto)`, GRANT só service_role.
- Filtros genéricos `{fonte, campo, operador, valor}` substituem `FiltrosMatriz`/`Filtros`; canal/atendente/equipe mapeados para esse formato, com compatibilidade de filtros já salvos.
- Avaliação cross-fonte por conjunto de contato_id (semi-join), sem multiplicar linhas.
- Aba nova em `ABAS_DADOS_ELORA`; regra registrada no AGENTS.md.
