# Etapa B — Diagnóstico (somente leitura)

Cliente: 8c0ojhr2. Nada é criado, gravado ou alterado no app, no banco ou no Elora.

## O que vou fazer
1. Ler a chave e o endereço do cliente no cofre, só no servidor (a chave nunca aparece).
2. Ler os canais permitidos (`permitido = true`) desse cliente.
3. Contatos — `GET /core/v1/contact` com IncludeDetails Tags, CustomFields, Portfolios, uma chamada para cada Status (ACTIVE, ARCHIVED, BLOCKED), paginando até o fim.
4. Atendimentos — `GET /chat/v2/session` com todos os IncludeDetails aceitos (testo cada um e listo quais a API aceita ou recusa), sem filtro de status, paginando até o fim.
5. Juntar todos os campos encontrados (inclusive aninhados) com tipo e quantos registros têm valor.
6. Contar contatos e atendimentos desde 28/10/2026 nos canais permitidos, por dia e por status.

## O que vou mostrar
- Tabela de todos os campos de contato e de atendimento (nome, tipo, % preenchido).
- Um registro de exemplo de cada, com telefone e nome mascarados (ex.: "Mar*** S***", "+55 11 9****-**21"); e-mails e documentos também mascarados.
- Existe / não existe: UTMs, etiquetas, canal, origem, atendente, tempo de espera, tempo de atendimento (e de onde dá para calcular, se não vier pronto).
- Contagens desde 28/10/2026: total e por dia, contatos e atendimentos, só canais permitidos.
- IncludeDetails aceitos e recusados, e qualquer erro (401/403/limite).

## Detalhes técnicos
- Script temporário em /tmp executado no servidor de desenvolvimento, usando `credenciais.server.ts` para decifrar; saída crua fica só em /tmp e é mascarada antes de mostrar.
- Só GET; sem migration, sem insert, sem mudança de código do projeto.
- Depois de mostrar, paro e aguardo sua decisão para a próxima parte da Etapa B.
