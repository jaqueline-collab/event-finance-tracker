## Correções de dados (junho/2026)

| Cliente | Cadastro atual | Correto | Ação |
|---|---|---|---|
| INTEP | 5 usuários | 6 | +1 usuário ativo em junho |
| Majestic | 4 usuários, 1 Instagram | 5, 0 | +1 usuário, remover Instagram retroativamente |

Zayn fica como está (Messenger é indiferente — plano Rabbit já inclui 1, sem cobrança).

**Passos:**
1. `elora_clientes`: INTEP `usuarios_ativos=6`; Majestic `usuarios_ativos=5, canais_insta=0`.
2. `elora_movimentos`:
   - INTEP: novo `upgrade` em 01/06/2026 `usuarios_ativos +1`.
   - Majestic: novo `upgrade` em 01/06/2026 `usuarios_ativos +1`; remover Instagram do movimento de setup (Majestic nunca teve Insta).
3. Recalcular `elora_fechamento_itens`/`elora_fechamentos`/`elora_financeiro` de junho/2026 para INTEP e Majestic. Snapshot antigo em `payload_snapshot.valorBrutoAnterior`. Nenhum DELETE.

## Limpeza das descrições no PDF

Regras aplicadas em `exportarAuditoriaPdf` (`src/routes/resumo.tsx`) na coluna Descrição da tabela LINHA DO TEMPO · MOVIMENTOS:

- **Remover sufixos redundantes**: `(setup)`, `desde o setup`, `Canais Extra (...)`, `Exclusão ...`, `Upgrade ...`, `Login extra`, `Logins Extra`, `(Churn registrado conforme planilha Monday)` e similares.
- **Nunca repetir a data** no texto (já existe coluna Data).
- **Nunca repetir o tipo** no texto (já existe coluna Tipo).
- Manter só o **delta objetivo**: `Usuários +1`, `WhatsApp +2 · Z-API +2`, `Instagram −1`, `WhatsApp −1`, `Churn`.
- Se o movimento só tem observação repetitiva sem delta, deixar a célula vazia.
- Consolidação por (data + tipo + plano) mantém múltiplos numa linha: `Usuários +2`, sem `(1º, 2º)`.

## Validação

Regerar PDF de junho e conferir:
- **Fischer**: linhas curtas — `WhatsApp +1 · Instagram +1`, `Instagram −1`, `Usuários +1`, `WhatsApp −1`, `WhatsApp +2 · Z-API +2`, `Usuários +2`, `Instagram +1`, `Usuários +1`, `Usuários +1`. Sem `(Login extra - dd/mm)`, sem `Exclusão ...`.
- **INTEP**: `Usuários +3` no setup, `Usuários +1` em 13/04, `Usuários +1` em 01/06. Excedentes = 3.
- **Majestic**: sem linha de Instagram (setup e composição), `Usuários excedentes = 2`, `WhatsApp 1`, `Z-API 2`. Total ajustado.

## Salvaguardas
Sem DELETE de cliente/fechamento. Apenas UPDATE de valores + INSERT de movimentos corretivos + edição do renderizador do PDF.
