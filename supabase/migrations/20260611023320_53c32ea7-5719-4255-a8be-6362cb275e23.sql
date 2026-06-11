ALTER TABLE public.elora_planos
  ADD COLUMN IF NOT EXISTS ciclo_dia_inicial integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS ciclo_dia_final integer NOT NULL DEFAULT 31,
  ADD COLUMN IF NOT EXISTS cobranca_proporcional boolean NOT NULL DEFAULT false;

ALTER TABLE public.elora_clientes
  ADD COLUMN IF NOT EXISTS ciclo_personalizado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ciclo_dia_inicial integer,
  ADD COLUMN IF NOT EXISTS ciclo_dia_final integer;