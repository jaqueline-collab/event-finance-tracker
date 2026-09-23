ALTER TABLE public.elora_dashboard_widgets
  ADD COLUMN IF NOT EXISTS layout jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.elora_dashboard_modelos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  widgets jsonb NOT NULL DEFAULT '[]'::jsonb,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.elora_dashboard_modelos TO authenticated;
GRANT ALL ON public.elora_dashboard_modelos TO service_role;

ALTER TABLE public.elora_dashboard_modelos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "modelos: equipe interna lê"
  ON public.elora_dashboard_modelos FOR SELECT TO authenticated
  USING (public.is_equipe_interna());

CREATE POLICY "modelos: equipe interna grava"
  ON public.elora_dashboard_modelos FOR INSERT TO authenticated
  WITH CHECK (public.is_equipe_interna());

CREATE POLICY "modelos: equipe interna atualiza"
  ON public.elora_dashboard_modelos FOR UPDATE TO authenticated
  USING (public.is_equipe_interna()) WITH CHECK (public.is_equipe_interna());

CREATE POLICY "modelos: equipe interna apaga"
  ON public.elora_dashboard_modelos FOR DELETE TO authenticated
  USING (public.is_equipe_interna());

CREATE INDEX IF NOT EXISTS idx_elora_dashboard_modelos_nome
  ON public.elora_dashboard_modelos (nome);