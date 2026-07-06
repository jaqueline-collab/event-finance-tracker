## Plano: distribuir os upgrades de login do Fischer nas datas corretas

### Resultado final esperado

3 usuários inclusos no plano + 6 upgrades de login = **9 usuários**, cobrando 6 × R$ 29,99 = **R$ 179,94/mês**.

### Operações no banco (tabela `elora_movimentos`, cliente Fischer)

1. **Remover** movimento `fisup0408` (08/04/2026 · Login Extra - SDR) — não corresponde a nenhum login real.
2. **Atualizar** `fisup0311` (11/03) — remover observação "Login Claudia", deixar apenas `Login extra - 11/03`.
3. **Atualizar** `fisup0609` (09/06) — remover observação "Login Extra - SDR", deixar apenas `Login extra - 09/06`.
4. **Atualizar** `fisup0618logins` (18/06) — mudar `usuarios_ativos` de `+5` para `+1`, observação `Login extra - 18/06`.
5. **Inserir** `fisup0525a` (25/05/2026) · upgrade · +1 usuário · `Login extra - 25/05 (1º)`.
6. **Inserir** `fisup0525b` (25/05/2026) · upgrade · +1 usuário · `Login extra - 25/05 (2º)`.
7. **Inserir** `fisup0625` (25/06/2026) · upgrade · +1 usuário · `Login extra - 25/06`.
8. **Manter** `elora_clientes.usuarios_ativos = 9` para o Fischer.

### Timeline final dos usuários

| Data | Delta | Observação |
|---|---|---|
| 11/03/2026 | +1 | Login extra - 11/03 |
| 25/05/2026 | +1 | Login extra - 25/05 (1º) |
| 25/05/2026 | +1 | Login extra - 25/05 (2º) |
| 09/06/2026 | +1 | Login extra - 09/06 |
| 18/06/2026 | +1 | Login extra - 18/06 |
| 25/06/2026 | +1 | Login extra - 25/06 |

### Validação após aplicar

- Fischer aparece com 9 usuários ativos.
- Auditoria mostra 6 linhas de "Usuários excedentes" nas datas acima, cada uma +R$ 29,99/mês.
- Movimento de 08/04 sumiu do histórico.
- Nenhuma alteração de código — apenas operações de dados.