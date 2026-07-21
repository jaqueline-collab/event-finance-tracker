# Auditoria Técnica Completa — PDF

Vou produzir um documento PDF extenso, seção por seção, cobrindo as 9 áreas solicitadas, no nível de detalhe de "entrega para nova equipe assumir o projeto sem contexto prévio".

## O que vou fazer

1. **Levantamento técnico** (leitura extensiva do código, sem alterar nada):
   - Mapear estrutura de pastas, `package.json`, versões de libs.
   - Ler todas as rotas em `src/routes/`, componentes-chave, `src/lib/store.ts`, integrações Supabase, MCP (`src/lib/mcp/`), `vite.config.ts`, `src/start.ts`.
   - Listar todas as tabelas do banco com colunas, tipos, PKs/FKs.
   - Listar todas as RLS policies ativas, functions SQL, triggers, views, buckets de storage.
   - Identificar secrets configurados (apenas nomes) e integrações externas (Lovable AI, MCP OAuth, etc.).
   - Mapear fluxos de auth (magic link, Google, OAuth server para MCP).
   - Mapear tokens de design (`src/styles.css`, tokens semânticos, tipografia, componentes shadcn).

2. **Análise crítica** (dívida técnica, segurança, performance):
   - Tabelas sem RLS ou com policies excessivamente abertas.
   - Chaves expostas em código cliente.
   - Código duplicado, TODOs, gargalos.
   - Dependência de recursos exclusivos do Lovable (Lovable Cloud, Lovable AI Gateway, MCP plugin).

3. **Geração do PDF** com ReportLab:
   - Fonte DejaVu Sans (obrigatória para acentuação em português).
   - Capa, sumário, 9 seções numeradas, cabeçalho/rodapé, paginação.
   - Tabelas para schema do banco e RLS policies.
   - Tipografia limpa, sem sobreposição, alinhada ao padrão dos outros PDFs do projeto (auditoria/fechamento).
   - QA visual: converter cada página em imagem e revisar sobreposição, corte, acentos, tabelas — reprocessar até ficar limpo.

4. **Entrega**:
   - Arquivo salvo em `/mnt/documents/auditoria-tecnica.pdf` com tag `<presentation-artifact>` para download imediato.
   - Nenhuma alteração no código-fonte, banco ou secrets.

## Seções do PDF

1. Visão Geral (propósito, stack, estrutura de pastas)
2. Conexões e Integrações Ativas (Supabase, GitHub, MCP, Lovable AI, secrets)
3. Banco de Dados (tabelas, colunas, relacionamentos, RLS, functions, storage)
4. Lógica de Negócio (módulos: clientes, planos, movimentos, fechamentos, financeiro, MAU, kanban, custos, descontos, parceiros)
5. Arquitetura Frontend (rotas, componentes, store Zustand-like, sync Supabase)
6. Design System (paleta HSL, tipografia, componentes shadcn, breakpoints)
7. Segurança (RLS coverage, exposição de chaves, validação de input, chamadas diretas)
8. Dívida Técnica (duplicações, TODOs, performance, escalabilidade)
9. Dependências para Rodar Fora do Lovable (Node, env vars, acoplamento com Lovable Cloud/MCP plugin)

## Escopo

- **Somente leitura + geração de PDF.** Nada de migrações, nada de alterações em `elora_*`, nada de mexer em fechamentos, clientes ou lançamentos financeiros existentes.
- Se alguma seção não se aplicar (ex: não há Edge Functions), será explicitamente marcada como "não aplicável", conforme pedido.
