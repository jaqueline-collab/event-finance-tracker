CREATE TABLE public.newsletter_inscricoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  origem text NOT NULL DEFAULT '',
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX newsletter_inscricoes_email_unq ON public.newsletter_inscricoes (lower(email));
GRANT SELECT ON public.newsletter_inscricoes TO authenticated;
GRANT ALL ON public.newsletter_inscricoes TO service_role;
ALTER TABLE public.newsletter_inscricoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipe interna lê inscrições" ON public.newsletter_inscricoes FOR SELECT TO authenticated USING (public.is_equipe_interna());