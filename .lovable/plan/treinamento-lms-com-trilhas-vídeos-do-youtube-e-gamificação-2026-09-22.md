# Treinamento (LMS) com trilhas, vídeos do YouTube e gamificação

## O que será construído

Uma área de Treinamento com trilhas de vídeos hospedados no YouTube (o sistema guarda só o link, nunca o arquivo), ordem obrigatória, e pontos/níveis/medalhas individuais — sem ranking e sem ninguém ver o progresso de outra pessoa.

## 1. Conteúdo

- **Trilha**: título, descrição, audiência (Parceiro **ou** Cliente), ativa/inativa, pontos de bônus ao concluir tudo, ordem na lista.
- **Vídeo**: título, descrição curta, link do YouTube, posição e pontos próprios.
- O player é o embutido do YouTube; serve qualquer vídeo público ou não listado, sem login.

## 2. Ordem e conclusão

- O primeiro vídeo da trilha sempre aberto; os demais só liberam depois do anterior concluído.
- Conclusão automática quando o player avisa que o vídeo terminou.
- Se o navegador bloquear esse aviso, o botão **"Marcar como concluído"** aparece depois de 90% assistido.
- Tentar abrir um vídeo ainda bloqueado não funciona — nem clicando, nem pelo endereço.

## 3. Gamificação (individual)

- **Pontos**: por vídeo concluído + bônus da trilha inteira.
- **Níveis**: faixas configuráveis (nome, pontos mínimos, ícone) — nada fixo no código.
- **Medalhas**: catálogo configurável com três tipos de critério — concluir uma trilha específica, atingir um total de pontos, concluir um número de vídeos em qualquer trilha.
- Medalha nova ou mudança de nível abrem um aviso de comemoração na hora.
- Painel de progresso visível só para o próprio usuário.

## 4. Onde aparece

- **Área do Parceiro**: novo item **Treinamento** no menu do topo (hoje não existe), mostrando só trilhas de audiência Parceiro.
- **Área do Cliente**: nova aba **Treinamento**, só trilhas de audiência Cliente.
- Em ambas: lista de trilhas com barra "X de Y vídeos", vídeo atual em destaque, e o bloco de pontos/nível/medalhas.

## 5. Administração (equipe interna)

Nova página **Treinamento** no menu lateral do EloraCRM (visível só para equipe interna):

- Criar, editar e reordenar trilhas e vídeos (link, pontos, ordem).
- Ligar/desligar trilha — desativada some das áreas de parceiro/cliente **sem apagar progresso**.
- Criar/editar medalhas e critérios.
- Configurar as faixas de nível.

## Detalhes técnicos

**Migração `0018_treinamento_lms.sql`** (tabelas em `public`, GRANT + RLS na mesma migração):

- `elora_trilhas` (id uuid, titulo, descricao, audiencia text check in ('parceiro','cliente'), ativa bool default true, pontos_bonus_conclusao int default 0, ordem int, timestamps)
- `elora_trilha_videos` (id uuid, trilha_id fk, titulo, descricao, youtube_url text, youtube_id text, ordem int, pontos int default 0) — unique (trilha_id, ordem)
- `elora_progresso_video` (id uuid, user_id uuid not null default auth.uid(), usuario_tipo text, video_id fk, concluido bool, concluido_em timestamptz) — unique (user_id, video_id)
- `elora_niveis_gamificacao` (id uuid, nivel int unique, pontos_minimos int, nome, icone)
- `elora_medalhas` (id uuid, nome, descricao, icone, criterio_tipo text check in ('trilha','pontos','videos'), criterio_valor text)
- `elora_medalhas_conquistadas` (id uuid, user_id uuid default auth.uid(), usuario_tipo text, medalha_id fk, conquistada_em) — unique (user_id, medalha_id)

RLS: conteúdo (trilhas, vídeos, níveis, medalhas) — SELECT para `authenticated`, escrita só com `is_equipe_interna()`; trilha inativa só é lida por equipe interna. Progresso e medalhas conquistadas — SELECT/INSERT/UPDATE apenas `user_id = auth.uid()`, mais leitura para `is_equipe_interna()`. GRANTs: `SELECT, INSERT, UPDATE, DELETE` para `authenticated` nas tabelas de progresso, `SELECT` para `authenticated` nas de conteúdo, `ALL` para `service_role`. Nenhum acesso `anon`.

**Servidor** — `src/lib/treinamento.functions.ts` (`createServerFn` + `requireSupabaseAuth`):
- `getTreinamento({ audiencia })` — trilhas ativas da audiência do usuário (derivada de `parceiro_do_usuario()` / `cliente_do_usuario()`; equipe interna pode passar audiência para pré-visualizar), com vídeos, progresso próprio, pontos totais, nível atual e medalhas.
- `concluirVideo({ videoId })` — valida no **servidor** que o vídeo anterior da trilha já foi concluído (a trava de ordem não é só visual), grava o progresso, recalcula pontos, aplica bônus da trilha e avalia os critérios de medalha; devolve `{ pontos, nivel, novasMedalhas, subiuDeNivel }`.
- `salvarTrilha`, `salvarVideo`, `reordenar`, `alternarTrilha`, `salvarMedalha`, `salvarNivel` — todas checando `is_equipe_interna()`.

**Interface**:
- `src/routes/treinamento.tsx` — administração (equipe interna), item novo em `configItemsAll` de `src/components/app-sidebar.tsx`.
- `src/components/treinamento/PainelTreinamento.tsx` — tela reutilizada nas duas áreas (lista de trilhas, player, bloco de progresso, modal de comemoração).
- `src/components/treinamento/PlayerYoutube.tsx` — iframe com a IFrame API do YouTube; evento de fim do vídeo e contagem de 90% para liberar o botão manual.
- `src/routes/parceiro.tsx` — nova aba `treinamento` no `searchSchema` e no menu do topo (hooks continuam no topo do componente).
- `src/routes/area-do-cliente.tsx` — nova aba `treinamento` no `Tabs` existente.

**Testes** — `src/lib/__tests__/treinamento.test.ts`: liberação sequencial de vídeos, soma de pontos com bônus, faixa de nível pela pontuação e disparo dos três tipos de critério de medalha.

## Validação

- Trilha "Parceiro" e trilha "Cliente" com 3 vídeos cada; cada painel mostra só a sua.
- Primeiro vídeo até o fim libera o segundo; o terceiro continua bloqueado (inclusive tentando forçar pelo servidor).
- Pontos por vídeo + bônus da trilha conferidos.
- Medalha por trilha concluída e medalha por total de pontos disparando no momento certo.
- Trilha desativada some da área do usuário e o progresso continua salvo.
- Nenhum usuário enxerga progresso, pontos ou medalhas de outro.
- Celular, tablet e computador, temas claro e escuro.
