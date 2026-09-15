# Roadmap

1. Histórico do cliente em pop-up (Dialog) na área do parceiro
2. Lista de clientes: remove Vencimento, adiciona LTV em dias
3. Gráfico com duas visões (Entradas e saídas / Ativos no mês) via search param
4. Preparação API app Elora:
   - Migração: elora_integracao_contas + elora_uso_snapshots (GRANTs/RLS conforme plano)
   - src/lib/integracao-elora.functions.ts (salvar/ler mascarado/testar/sincronizar)
   - Aba "Integração Elora" no cadastro interno do cliente
   - Teste automatizado de RLS/chaves
5. Regenerar types, validar build e telas (390/834/1440, claro/escuro)
