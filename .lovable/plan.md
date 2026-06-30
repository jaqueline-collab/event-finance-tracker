## 1. Cadastrar Dra. Cecilia Bunn

```text
Nome:            Dra. Cecilia Bunn
CPF/CNPJ:        08.965.305/748   → observação
Plano:           Essencial Rabbit Agency (ciclo padrão 5→4)
Data setup:      2026-06-12
Canais:          1 whats incluso, sem Insta/Messenger
Z-API:           1
Usuários:        3 (inclusos)
Acompanhamento:  R$ 250,00
```

Receita: 199,99 + 69,99 (Z-API) + 250 = **R$ 519,98** ✓ Monday. Entra no fechamento de julho (ciclo 12/06→04/07).

## 2. Upgrade Instituto Murilo Fischer — 22/06/2026

1. Ler `usuarios_ativos` atual da Fischer.
2. Inserir movimento `tipo=upgrade`, data `2026-06-22`, `usuarios_ativos = atual + 1`, observação "Upgrade +1 login".
3. Atualizar `elora_clientes.usuarios_ativos`.

## 3. Resumo Mensal: descontos refletindo + vencimento completo

Dois ajustes em `src/routes/resumo.tsx`:

**a) Vencimento com mês/ano**  
Hoje a coluna mostra só o dia (ex.: `04`). Trocar para `dd/MM/yyyy` (ex.: `04/07/2026`). Aplicar tanto na tabela quanto no PDF gerado.

**b) Descontos refletindo no resumo**  
Hoje os descontos aparecem como chip amarelo ao lado do cliente e no totalizador inferior, mas o **valor da linha do cliente continua mostrando o subtotal cheio**. Ajustar:

- Coluna "Total" da linha do cliente: mostrar `subtotal riscado` + `total com desconto` em destaque, igual ao card inferior.
- Soma "Subtotal" / "Descontos" / "Total" do fechamento já existe — manter.
- PDF do fechamento: incluir coluna "Desconto" e "Total líquido" por cliente, e linha de descontos no rodapé.
- Timeline do cliente (drawer ao clicar na linha): adicionar item "Desconto aplicado" com valor e motivo, posicionado no fim do ciclo.

## 4. Majestic — reconciliação (aguardando 1 linha sua)

Planilha Monday só traz MRR consolidado (R$ 639,94 = 389,94 sistema + 250 assess) e a aba "updates" não tem registros da Majestic. Delta sistema = R$ 59,98 = exatamente **2 × R$ 29,99** → 2 adicionais que não estão cadastrados desde 17/03.

Composições possíveis:

```text
A) Rabbit + 1 whats + 1 insta + 1 messenger + 1 user + 1 z-api  = 389,94
B) Rabbit + 1 whats + 3 users + 1 z-api                          = 389,94
```

Me confirma **A**, **B** ou outra. Lanço movimento retroativo `tipo=upgrade` em `2026-03-17` com o estado correto — fechamentos de mar/abr/mai retroagem e passam a bater com o Monday.

## 5. Ordem de execução

1. Inserir Cecilia Bunn.
2. Ler Fischer atual + lançar upgrade 22/06.
3. Ajustar `resumo.tsx`: vencimento `dd/MM/yyyy`, descontos refletidos na linha + PDF + timeline.
4. Aguardar você confirmar A/B → lançar retroativo Majestic 17/03.

## Detalhes técnicos

- Cecilia herda ciclo do plano (sem `ciclo_personalizado`).
- Movimento Fischer guarda só `usuarios_ativos` + observação; demais campos null (snapshot reaproveita).
- Formatação do vencimento via `format(vencimento, 'dd/MM/yyyy', { locale: ptBR })`.
- Desconto na linha: usar `aplicarDescontosCliente` (já existe em `src/lib/calc/desconto.ts`) — devolve `{ subtotal, totalLiquido, descontos[] }`. Renderizar ambos quando `descontos.length > 0`.
- PDF: ampliar a tabela em 1 coluna; ajustar larguras proporcionais.
