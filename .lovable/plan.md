Plano para corrigir sem apagar mais nada:

1. Proteger contra exclusões acidentais
- Remover/desativar o script destrutivo que ainda existe no código e apaga clientes/movimentos por lote.
- Travar `resetAll` definitivamente como somente recarregamento seguro, sem limpeza local.
- Colocar confirmação forte antes de excluir cliente/movimento/fechamento, com texto claro do impacto.
- Ajustar a exclusão de fechamento para não apagar lançamentos financeiros já existentes automaticamente; no máximo cancelar/desvincular, preservando histórico.

2. Corrigir a causa raiz técnica
- Hoje o setup criado ao cadastrar cliente fica só na tela/local e não é salvo no banco. Vou fazer o setup inicial ser salvo em `elora_movimentos` junto com o cliente.
- A tabela de itens de fechamento está com `cliente_id`/`plano_id` como UUID, mas os clientes/planos do sistema usam IDs de texto. Isso pode impedir salvar itens de fechamento e deixar registros incompletos. Vou ajustar esses campos para texto.
- Se a gravação dos itens de fechamento falhar, o sistema não deve fingir que deu certo: precisa reverter o fechamento recém-criado ou mostrar erro claro, sem mexer em dados antigos.

3. Restaurar Dr. Lucas Moura
- Recriar `Dr. Lucas Moura` sem mexer nos demais clientes:
  - setup/data de início: `17/06/2026`
  - plano: `Essencial Rabbit Agency`
  - acompanhamento: `R$ 250,00`
  - 1 canal WhatsApp incluído e 1 Z-API ativa
  - setup pago: `R$ 0,00`
- Criar também o movimento de setup correspondente em `elora_movimentos`, para não desaparecer em recarregamentos futuros.

4. Relançar o fechamento de Junho/2026 pelo PDF anexado
- Recriar um fechamento persistente da competência `2026-06`, ciclo `05/06/2026 a 04/07/2026`, vencimento `05/07/2026`.
- Itens conforme o PDF:
  - INTEP's Treinamentos: R$ 579,96
  - Dr Alexandre Mansur: R$ 549,97
  - Dra. Cecilia Bunn: R$ 0,00 com desconto de R$ 519,98
  - ZAYN CLINICA LTDA: R$ 709,93
  - Dra. Isabela Zanini: R$ 549,97
  - Dra. Anna Karoline: R$ 549,97
  - Dra Tatiana Patruni: R$ 549,97
  - Dra Estéfani: R$ 549,97
  - Dr Jonas Lenzi: R$ 549,97
  - Camila Ahrens: R$ 549,97
  - Érico Servano: R$ 519,98
  - Instituto Murilo Fischer: R$ 1.099,93 com desconto de R$ 149,95
  - Majestic Transplante Capilar: R$ 579,96 com desconto de R$ 99,98
  - Dr. Lucas Moura: R$ 519,98
- Totais do PDF:
  - bruto: `R$ 8.629,44`
  - descontos: `R$ 769,91`
  - líquido: `R$ 7.859,53`
- Manter o lançamento financeiro antigo de junho se ele já existir; se necessário, criar apenas o vínculo/registro persistente do fechamento, sem apagar lançamentos manuais.

5. Validação final
- Conferir no banco que:
  - Dr. Lucas existe.
  - Movimento de setup do Dr. Lucas existe em 17/06/2026.
  - Fechamento persistente de junho existe com 14 itens e total R$ 7.859,53.
  - Nenhum fechamento, lançamento financeiro, cliente ou movimento antigo foi removido.