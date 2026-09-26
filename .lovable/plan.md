# Correções pós-auditoria: segurança, custo duplicado, testes e painel do Fischer

## Contexto (confirmado por leitura)

1. **Erro de segurança (linter):** a view `public.elora_planos_parceiro` roda como `postgres` (security_invoker=off), ignorando o RLS de `elora_planos` (policies owner-scoped). Qualquer usuário logado lê o catálogo inteiro de planos. A view expõe só colunas seguras (id, nome, categoria, cobrança, franquias, módulos, vencimento, ciclo) — sem valores/custos — e é usada em `src/lib/parceiro.functions.ts` (`db.from("elora_planos_parceiro").select("id, nome")`). Grants: SELECT para `authenticated`; anon revogado.
2. **Custo em dois lugares:** `src/lib/calc/custo.ts` (`explicarCustoCliente`) é a regra oficial — tabela WTS com faixas escalonadas. Mas `realTimePricing` em `src/routes/clientes.tsx` (linhas 166–262) recalcula custo com fórmula própria divergente: licença vem de `plano.licencaBase` (não da WTS), canais sem escalonamento por faixa, Z-API cobrado sobre **todos** os canais (não só excedentes), franquia de contatos com fallback 500. Resultado: o cadastro/edição de cliente mostra custo/lucro diferentes do Dashboard, resumo e fechamento.
3. **Mensalidade sem testes:** `receitaMensalCliente`/`detalharCicloCliente` em `src/lib/calc/receita.ts` não têm cobertura; os 52 testes atuais cobrem grade, treinamento, calculadora do parceiro etc., não a receita.
4. **Painel do Cirurgiões Staffs - Fischer (`oxi9byp0`):** os 6 widgets originais foram substituídos num teste de aplicação de modelo; precisa reconstrução manual.

## Ordem e escopo

### 1. View `elora_planos_parceiro` (fura a fila)
- Substituir a leitura direta da view em `parceiro.functions.ts` por um caminho com verificação: função server `getCatalogoPlanosParceiro` com `requireSupabaseAuth` que exige `is_equipe_interna()` OU `parceiro_do_usuario()` não nulo, e projeta apenas as colunas seguras (as mesmas da view).
- Migração SQL: `DROP VIEW public.elora_planos_parceiro` (e remover dos tipos regenerados). Sem view, o erro do linter desaparece e cliente comum perde acesso ao catálogo.
- Regenerar `src/integrations/supabase/types.ts`.

### 2. Custo duplicado em `clientes.tsx`
- Reescrever `realTimePricing` para derivar o custo de `explicarCustoCliente` (fonte única WTS), montando um `Cliente` temporário a partir do formulário.
- Manter o faturamento (preço de cliente) como está — ele é comercial, por plano, e não diverge.
- O lucro exibido passa a ser `receitaTotal - custoTotal` com o custo oficial, igual ao Dashboard/resumo/fechamento.
- Ajustar o detalhamento exibido no formulário para refletir os itens de `explicarCustoCliente` (inclui escalonamento e Z-API só excedente).

### 3. Testes da mensalidade (`receita.ts`)
- Novo `src/lib/calc/receita.test.ts` cobrindo: mensalidade base (licença + acompanhamento), excedentes por tipo de canal, usuários e contatos com faixas, módulos opcionais (IA/Asaas/Z-API/transcrição por usuário), troca de plano com cobrança proporcional dentro do ciclo, ciclo personalizado, e `receitaSistemaCliente` (sem acompanhamento).
- Teste de paridade: `realTimePricing` (extraído para função pura em `src/lib/calc/` se necessário) e `explicarCustoCliente` devem produzir o mesmo custo para o mesmo cliente.

### 4. Painel do Fischer (por último, com a usuária)
- Reconstruir os 6 widgets do cliente `oxi9byp0` junto com a Jaqueline (ela indica quais blocos havia); sem urgência.

## Validação
- `bunx tsgo --noEmit` limpo; `bunx vitest run` verde (52 atuais + novos).
- `supabase--linter` sem o ERROR de security definer view.
- Playwright: cadastro de cliente mostrando custo/lucro iguais aos do Dashboard para o mesmo cliente; calculadora do parceiro listando planos normalmente após a troca da view; login de cliente comum sem acesso ao catálogo.

## Fora de escopo
- Os 12 avisos restantes do linter (funções SECURITY DEFINER executáveis por anon/authenticated) — revisão separada depois desta rodada.
