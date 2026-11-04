CREATE TABLE public.elora_dashboard_visoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id text NOT NULL REFERENCES public.elora_clientes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  publicada boolean NOT NULL DEFAULT false,
  filtros jsonb NOT NULL DEFAULT '[]'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.elora_dashboard_visoes FROM anon, authenticated;
GRANT ALL ON public.elora_dashboard_visoes TO service_role;
ALTER TABLE public.elora_dashboard_visoes ENABLE ROW LEVEL SECURITY;
CREATE INDEX elora_dashboard_visoes_cliente_idx ON public.elora_dashboard_visoes (cliente_id, ordem);

CREATE OR REPLACE FUNCTION public.touch_elora_dashboard_visoes()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END; $$;
CREATE TRIGGER touch_elora_dashboard_visoes BEFORE UPDATE ON public.elora_dashboard_visoes
  FOR EACH ROW EXECUTE FUNCTION public.touch_elora_dashboard_visoes();

ALTER TABLE public.elora_dashboard_widgets
  ADD COLUMN IF NOT EXISTS visao_id uuid REFERENCES public.elora_dashboard_visoes(id) ON DELETE CASCADE;

INSERT INTO public.elora_dashboard_visoes (cliente_id, nome, ordem, publicada)
SELECT DISTINCT cliente_id, 'Resultados', 0, true FROM public.elora_dashboard_widgets;

UPDATE public.elora_dashboard_widgets w SET visao_id = v.id
FROM public.elora_dashboard_visoes v
WHERE v.cliente_id = w.cliente_id AND w.visao_id IS NULL;