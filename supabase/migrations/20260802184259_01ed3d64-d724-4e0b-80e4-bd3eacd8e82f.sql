ALTER TABLE public.elora_clientes
  ADD COLUMN IF NOT EXISTS status_comercial text NOT NULL DEFAULT 'ativo';

UPDATE public.elora_clientes SET status_comercial = 'ativo' WHERE status_comercial IS DISTINCT FROM 'trial';

ALTER TABLE public.elora_clientes
  DROP CONSTRAINT IF EXISTS elora_clientes_status_comercial_check;

ALTER TABLE public.elora_clientes
  ADD CONSTRAINT elora_clientes_status_comercial_check CHECK (status_comercial IN ('ativo','trial'));