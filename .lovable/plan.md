# Fechamento antes de publicar (4 pontos) + pedidos do arquivo anexo

Regra geral: retrato antes e depois de cada parte; parar e mostrar se algum número mudar sem aprovação. Não publicar.

## Parte A — os 4 pontos (nesta ordem)

1. **Usuários de suporte por nome, e-mail e telefone**
   - A lista passa a aceitar telefone, além de nome e e-mail.
   - Incluir Jaqueline Ditós com jaqueline@eloracrm.com.br e 21995501331.
   - A pessoa é reconhecida se qualquer um dos três bater (telefone comparado só pelos dígitos, com ou sem 55).
   - Esperado: zero diferenças (ela já era reconhecida pelo nome); se mudar, paro e mostro.

2. **Responsável de card**
   - Levantar todos os lugares onde aparece: filtros, tabelas, agrupar, exportar, Elora IA, vínculo de equipe.
   - Aplicar a mesma regra dos atendentes: a pessoa de suporte some e o card dela vai para "Sem informação".
   - Totais de cards iguais no antes e depois. Relatório lista cada lugar conferido.

3. **Atendente da conversa pela resposta anterior**
   - O espelho de mensagens guarda quem enviou cada mensagem (identificador do usuário, marca de bot e direção). Dá para fazer.
   - Regra: se a última resposta humana foi de suporte, usar a resposta humana anterior mais recente que não seja de suporte. Se não houver, fica "Sem atendente". Se a última não for de suporte, nada muda.
   - Mostrar antes e depois: quantas conversas saem de "Sem informação" e para quem vão, por período (14/10–12/11 e 22/09–03/10). Total de conversas igual.
   - Paro aqui para sua aprovação, já que essa mudança altera a divisão por atendente.

4. **Remover o Social Seller antigo** (0 valores). Sem mexer em sincronização por widgets, relatório gravado antigo e Kanban.

## Parte B — arquivo anexo (ordenar colunas e ícone "i")

Começa só depois da Parte A aprovada.
- **Ordenar qualquer coluna:** clique alterna crescente, decrescente e padrão, com seta; datas por data real; uma coluna por vez; Total sempre no rodapé; Exportar respeita a ordem; quem vê não grava; super admin salva o padrão; Matriz padrão Dia mais recente primeiro. Vale em todas as tabelas pela barra padrão.
- **Ícone "i":** ao lado do título de cada bloco e coluna; balão com o que é, como é contado, de onde vem e qual data, avisos e filtros em vigor (incluindo fixos); funciona com mouse, teclado e toque. Textos de um dicionário único escrito das regras reais; edição por cliente pela super admin; blocos/colunas do construtor ganham texto automático.
- **Parada obrigatória:** antes de gravar, mostro a lista completa de textos (todas as colunas da Matriz e blocos de Resultados, Agenda e Agendamentos) para sua revisão.

## Conferência
- Testes por item (suporte por e-mail/telefone, responsável de card, atendente pela resposta anterior, ordenação por data/número, Total fixo, ordem no Exportar, balão com filtros fixos, teclado).
- Tela em 390, 834 e 1440 nos dois temas; se a tela de super admin não abrir no preview, digo claramente o que não vi.

## Detalhes técnicos
- `elora_suporte_interno` ganha coluna `telefone`; `suporte.ts` passa a casar por nome/e-mail/telefone/userId resolvido.
- Responsável de card: aplicar o mesmo filtro de `suporte.ts` na leitura de cards (`cartao-calculo.server.ts`, `campos-elora`, `graficos`, exportação, `elora-ia-ferramentas`, mapa de equipe).
- Atendente: estender `elora_conversas_pares` para devolver a última resposta humana não-suporte a partir de `elora_mensagens_espelho.user_id_elora` (sem trazer linhas ao servidor); invalidar `elora_calculo_cache` pela versão de configuração.
- Social Seller: remover `elora_relatorio_social_seller` e o código em `integracao-elora.functions.ts`.
