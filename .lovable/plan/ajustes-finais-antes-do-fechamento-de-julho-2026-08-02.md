# Ajustes finais antes do fechamento de julho

Duas correções pontuais de dados, nada de código, nada de estrutura.

## 1. Remover o movimento órfão

- Apagar apenas o registro `ip3p6i8p` em `elora_movimentos` (cliente `lev0gnwq`, setup 26/07, 2 Whats + 2 Z-API, 5 usuários).
- Esse cliente já não existe — é o resto da duplicata do "Cirurgiões Staffs - Fischer" que você apagou.
- Nenhum outro movimento é tocado.

## 2. Marcar o Dr. Carlos Ospina como churn

- Ajustar `status_comercial` do cliente `brvvvywo` para refletir o churn.
- `data_inicio` (13/07) e `data_churn` (20/07) permanecem como estão.
- O movimento de churn de 20/07 permanece intacto.

Observação: o status hoje só aceita "ativo" ou "trial". Se "churn" não for um valor aceito pelo cadastro, mantenho o status como está e o churn continua valendo pela `data_churn` — aviso antes de mudar qualquer coisa.

## Mantido como está

- Cirurgiões Staffs - Fischer com acompanhamento R$ 0 (confirmado por você).
- Todos os movimentos e cadastros de Fischer, ZAYN e dos 5 clientes de julho.
- Nenhum fechamento ou lançamento financeiro é alterado.

## Detalhes técnicos

- Um `DELETE` em `elora_movimentos` filtrado por `id = 'ip3p6i8p'`.
- Um `UPDATE` em `elora_clientes` filtrado por `id = 'brvvvywo'`, apenas na coluna `status_comercial`.
- Se marcar "churn" exigir ampliar os valores permitidos no cadastro (tipos, formulário e filtros), isso vira uma segunda etapa que apresento separadamente antes de mexer.
