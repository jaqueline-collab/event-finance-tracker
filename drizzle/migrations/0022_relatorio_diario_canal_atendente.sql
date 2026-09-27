-- Adiciona as dimensões Canal e Atendente ao relatório diário.
-- O grão da tabela passa de (cliente_id, data) para
-- (cliente_id, data, canal, atendente) para permitir o corte por essas
-- dimensões. Usamos '' (texto vazio) como sentinela de "não informado" em
-- vez de NULL, porque o Postgres trata NULLs como distintos entre si em uma
-- UNIQUE — o que quebraria o dedup do upsert (onConflict) assim que duas
-- linhas do mesmo cliente/dia chegassem sem canal/atendente. NOT NULL
-- DEFAULT '' garante que as 3 linhas já existentes na tabela (sem
-- canal/atendente) recebam '' automaticamente e continuem únicas e legíveis
-- sob a nova constraint, sem perda de dado.

ALTER TABLE public.elora_relatorio_diario
  ADD COLUMN canal text NOT NULL DEFAULT '',
  ADD COLUMN atendente text NOT NULL DEFAULT '';

ALTER TABLE public.elora_relatorio_diario
  DROP CONSTRAINT elora_relatorio_diario_cliente_id_data_key;

ALTER TABLE public.elora_relatorio_diario
  ADD CONSTRAINT elora_relatorio_diario_cliente_data_canal_atendente_key
  UNIQUE (cliente_id, data, canal, atendente);
