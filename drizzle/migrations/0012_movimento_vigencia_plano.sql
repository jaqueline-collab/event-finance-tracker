ALTER TABLE public.elora_movimentos
  ADD COLUMN IF NOT EXISTS vigencia_plano text,
  ADD COLUMN IF NOT EXISTS cobranca_troca text;

ALTER TABLE public.elora_movimentos
  ADD CONSTRAINT elora_movimentos_vigencia_plano_chk
  CHECK (vigencia_plano IS NULL OR vigencia_plano IN ('este_ciclo','proximo_ciclo')) NOT VALID;

ALTER TABLE public.elora_movimentos
  ADD CONSTRAINT elora_movimentos_cobranca_troca_chk
  CHECK (cobranca_troca IS NULL OR cobranca_troca IN ('integral','proporcional')) NOT VALID;