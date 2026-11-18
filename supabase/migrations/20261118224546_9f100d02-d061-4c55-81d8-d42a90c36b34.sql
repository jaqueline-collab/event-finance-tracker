CREATE TABLE public.elora_conferencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL,
  origem text NOT NULL DEFAULT 'manual',
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  concluido_em timestamptz,
  situacao text NOT NULL DEFAULT 'conferindo',
  progresso text,
  cursor jsonb NOT NULL DEFAULT '{}'::jsonb,
  linhas jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX elora_conferencias_cliente_idx ON public.elora_conferencias (cliente_id, iniciado_em DESC);
REVOKE ALL ON public.elora_conferencias FROM anon, authenticated;
GRANT ALL ON public.elora_conferencias TO service_role;
ALTER TABLE public.elora_conferencias ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.touch_elora_conferencias() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER touch_elora_conferencias BEFORE UPDATE ON public.elora_conferencias FOR EACH ROW EXECUTE FUNCTION public.touch_elora_conferencias();