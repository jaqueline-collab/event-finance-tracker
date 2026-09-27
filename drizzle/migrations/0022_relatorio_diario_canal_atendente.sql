ALTER TABLE public.elora_relatorio_diario
  ADD COLUMN canal text NOT NULL DEFAULT '',
  ADD COLUMN atendente text NOT NULL DEFAULT '';
ALTER TABLE public.elora_relatorio_diario
  DROP CONSTRAINT elora_relatorio_diario_cliente_id_data_key;
ALTER TABLE public.elora_relatorio_diario
  ADD CONSTRAINT elora_relatorio_diario_cliente_data_canal_atendente_key
  UNIQUE (cliente_id, data, canal, atendente);