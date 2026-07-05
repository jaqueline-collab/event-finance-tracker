## O que é "canaisZapi puro"

É só o jeito de dizer: **usar o campo `canaisZapi` do cliente como fonte única da verdade**, sem misturar com `canaisWhats` nem com o flag booleano antigo `zapi`.

Hoje o código tem 3 lugares onde essa mistura acontece:
- `canaisWhats = cliente.canaisWhats ?? (cliente.canaisZapi || (cliente.zapi ? 1 : 0))` → fallback ruim que confunde whats com zapi
- Motor Helena: `qtdZapi = max(canaisWhats, cliente.zapi?1:0)` → força 1 Z-API por whats
- Fallback do booleano `zapi` em várias fórmulas

**Regra correta (confirmada):** Z-API é uma contratação extra, independente. Cliente tem X canais WhatsApp e, separadamente, Y Z-APIs contratados (0 ≤ Y ≤ X normalmente, mas não obrigatório).

## Mudanças

### 1. `src/lib/calc/helena.ts` — `calcularCustoBrutoHelena`
- Trocar `qtdZapi = Math.max(canaisWhats, (c.zapi ? 1 : 0))` por `qtdZapi = c.canaisZapi ?? 0`
- Remover o fallback `(c.canaisZapi || (c.zapi ? 1 : 0))` no cálculo de `canaisWhats` — usar `c.canaisWhats ?? 0` puro

### 2. `src/lib/calc/custo.ts` — `custoMensalCliente`
- Trocar `canaisWhats = cliente.canaisWhats !== undefined ? cliente.canaisWhats : (cliente.canaisZapi || (cliente.zapi ? 1 : 0))` por `cliente.canaisWhats ?? 0`
- `qtdZapi = cliente.canaisZapi ?? 0` já está correto — manter

### 3. `src/lib/calc/receita.ts` — `receitaMensalCliente`
- Mesmo tratamento em `canaisWhats`: usar `cliente.canaisWhats ?? 0` puro
- Z-API na venda já usa `canaisZapi` puro — manter

### 4. Flag `cliente.zapi` (booleano)
- Fica **obsoleto** nos cálculos (não é mais lido)
- Não removo do schema/tipo nesta etapa para não quebrar telas de cadastro/histórico — só paro de usar nos motores
- Posso remover em passo separado depois, se quiser

## O que NÃO muda

- Escalas Helena (canais/usuários/contatos), descontos de escala, franquias inclusas, preço unitário Z-API (R$ 69 custo / R$ 149 venda) — tudo intacto
- UI de cadastro do cliente
- Migração de dados no banco

## Validação depois de aplicar

- Regenerar o PDF de custos Helena para conferir que a linha "Z-API = canaisZapi × 69" aparece só onde o cliente realmente contratou
- Rodar tela de venda com um cliente exemplo (2 whats, 1 zapi) e conferir: custo Z-API = R$ 69, receita Z-API = R$ 149
