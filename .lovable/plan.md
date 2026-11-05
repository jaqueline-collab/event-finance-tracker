# Fase 3: princípio "dados incompletos", visão Matriz, regras do relatório e limpeza do Painel do cliente

Alvo visual: imagem da Matriz do desenho, com os tokens e componentes do app, claro e escuro. Sem menu de topo; menu lateral da Área do cliente fica.

## 0. Princípio do produto
- **Onde registrar:** a estrela-guia guarda só objetivo e métrica (uma linha cada). Colocar as 4 regras lá quebra a leitura do arquivo. Proposta: registrar como regra permanente do projeto (memória principal + regras técnicas), aplicada em toda entrega. Se você ainda quiser no arquivo da estrela-guia, escrevo lá como nota sua.
- **Aplicar ao que já existe (antes da Matriz):**
  1. Rótulo único "Não definido" para canal, equipe, atendente, etiqueta, origem, campanha, etapa e campo personalizado, em relatório, painel, chips, gráficos e tela de validação (ex.: Messenger sem equipe, linha sem canal). No banco continua vazio; nada regravado.
  2. Indicador com configuração incompleta deixa de bloquear: fica fora da conta e só a super admin vê aviso discreto.
  3. Cliente sem cards, indicadores, UTM, mapa ou classificação: blocos correspondentes somem, sem cartão vazio nem mensagem.
  4. Mapas, listas e regras com padrão vazio (conferir que nada vem pré-preenchido fora dos dados do cliente).
  5. Testes: trocar nomes reais ("Dr. Ricardo", "8c0ojhr2") por clientes fictícios. Revisão inicial: no código do app não há nome de pessoa, canal ou cliente; só nesses dois testes.
- Entrego a lista do que foi encontrado e mudado.

## 1. Visão Matriz
- Nova visão ao lado das outras: um dia por linha (São Paulo), uma coluna por indicador, linha de total no rodapé.
- Respeita o período e os chips (canal, origem, atendente, etiqueta, equipe), com "Não definido" como opção.
- Célula estimada com marca "estimado"; total mostra a marca quando inclui dia estimado.
- Cabeçalho fixo, rolagem lateral em telas estreitas, ordenação por coluna.
- Lê o relatório diário gravado + motor de indicadores, por função de servidor que valida acesso e filtra pelo cliente.

## 2. Colunas e editor (só super admin, recusado no servidor para os demais)
- "+ Coluna" no fim do cabeçalho e "⋯" por coluna, só em modo Editar. Editor em painel lateral; grava na configuração de indicadores do cliente.
- **Do app (azul):** 5 colunas padrão; ocultar e reordenar, sem editar regra.
- **Manual (amarela):** valor digitado por dia, com quem alterou e quando (nova tabela por cliente, sem acesso direto).
- **Combinada (roxa):** fonte, medida (contagem/soma/média), evento (entrou na etapa, virou ganho, virou perdido, campo preenchido, foi criado), condições E/OU com campo + fonte em seletor agrupado (card, contato, atendimento, UTM). Texto explícito: "campo do contato usa o primeiro contato do card". Operadores: preenchido, vazio, igual, contém. Conta uma vez, no primeiro dia em que vale.
- **Fórmula (verde):** soma, diferença, razão, percentual entre colunas, por nome. Referência inexistente = célula "Configuração com erro", Matriz continua.
- Editor: nome, tipo, formato (número, %, moeda), ordem, ativo, prévia dos últimos 30 dias antes de salvar. Sem cards/classificação, esses eventos e fontes não são oferecidos.

## 3. Regras do relatório (Configurar > Painel do cliente > "Regras do relatório")
- Lista global de suporte interno (e-mail ou nome).
- Por cliente: mapa de equipe por canal (canal sem equipe = "Não definido"), atendentes ignorados (vazia por padrão), fonte dos dados (automática/antiga).
- Só super admin; sem botão desativado nem "em breve".

## 4. Limpeza da aba Painel do cliente (proposta, nada apagado)
| Item | Fica | Sai | Muda |
|---|---|---|---|
| "Incluído no relatório diário" | A opção no banco e as duas rotas da automação externa (listar clientes / registrar), que dependem dela | — | Vira "Enviar à automação externa (n8n)", com texto dizendo que o relatório já é calculado pelo app. Remoção só quando nenhum cliente depender do n8n, com seu ok |
| Classificações de atendimento / Rótulos desta conta | Dados e funções | Some a seção para cliente sem classificação sincronizada e sem rótulo | — |
| "Meu Dash" (construtor antigo) | Widgets gravados e a visão oculta "Widgets antigos" | O bloco "Meu Dash" sai da aba (Matriz e visões substituem) | Dr. Gean continua vendo o painel igual (teste) |
| Formulário fixo de filtros | Tudo, sem mexer | — | Listo o que depende dele para a Etapa F |

## 5. Dados e isolamento
Tudo por cliente, tabelas novas com RLS ligado e sem policy, acesso só por função de servidor. Não super admin vê a Matriz pronta, sem controles, na tela e no servidor. Texto das mensagens nunca lido.

## 6. Testes
- Cliente sem mapa, cards e classificação: Matriz com colunas padrão e "Não definido", sem erro.
- Mesma regra, fontes diferentes (card x contato) dão resultados diferentes.
- Não super admin não cria, edita, reordena, oculta coluna nem edita célula manual (servidor).
- Fórmula com coluna inexistente: erro de configuração, Matriz funciona.
- Estimados sempre marcados e fora de totais sem marca.
- Painel do Dr. Gean igual.

## Entrega
Executar após aprovação, rodar testes, conferir em 390, 834 e 1440 de largura nos dois temas (a conferência logada pode não ser possível com o banco externo; aviso se for o caso), listar o alterado/removido e parar. Não publicar.

## Detalhes técnicos
- Nova tabela `elora_matriz_manual` (cliente_id, coluna_chave, data, valor, alterado_por, alterado_em) + coluna `formato`/`tipo` estendido em `elora_indicadores_config` (tipos: sistema, manual, combinada, formula). Migração com GRANT só a service_role, RLS sem policy.
- Função pura `rotuloDimensao` → "Não definido"; motor de fórmula puro em `src/lib/matriz.ts`.
- Funções em `matriz.functions.ts` com `exigirSuperAdmin` nas escritas.
