# Cliente novo não aparece no filtro "Ativo"

## O que está acontecendo

O cliente **Cirurgiões Staffs - Fischer** está gravado no banco, sem data de churn, com setup em 26/07/2026.

A tela de Clientes classifica cada cliente em uma única situação:

```text
cancelado  -> tem data de churn
trial      -> sem churn e até 14 dias desde o setup
ativo      -> sem churn e mais de 14 dias desde o setup
```

Como o setup foi há 7 dias, ele é rotulado apenas como "Trial". Ao filtrar por "Ativo", ele fica escondido — exatamente o que você viu. Qualquer cliente novo some do filtro "Ativo" nos primeiros 14 dias.

## Correção

Tornar as situações não exclusivas: cliente sem churn é sempre **Ativo**, e "Trial" vira uma marcação adicional dos primeiros 14 dias.

- Filtrar por "Ativo" mostra todos os clientes sem churn (inclusive os em trial).
- Filtrar por "Trial" continua mostrando só os recém-criados.
- Filtrar por "Cancelado" segue igual.

## Detalhe técnico

Em `src/routes/clientes.tsx`, no cálculo de `clientesFiltrados`: hoje `isAtivo = !cancelado && !isTrial`; passa a ser `isAtivo = !cancelado`, mantendo `isTrial` como rótulo paralelo. Sem mudanças de dados ou de banco.