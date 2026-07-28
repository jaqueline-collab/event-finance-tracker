ALTER TABLE public.elora_clientes ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.touch_elora_clientes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_elora_clientes ON public.elora_clientes;
CREATE TRIGGER trg_touch_elora_clientes
BEFORE UPDATE ON public.elora_clientes
FOR EACH ROW EXECUTE FUNCTION public.touch_elora_clientes();