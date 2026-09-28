ALTER TABLE public.elora_relatorio_diario
  ADD COLUMN conversas_usuario_novos integer NOT NULL DEFAULT 0,
  ADD COLUMN conversas_origem_canal integer NOT NULL DEFAULT 0,
  ADD COLUMN conversas_total_dia integer NOT NULL DEFAULT 0;

CREATE TABLE public.elora_relatorio_social_seller (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id text NOT NULL REFERENCES public.elora_clientes(id) ON DELETE CASCADE,
  data date NOT NULL,
  canal text NOT NULL DEFAULT '',
  equipe text NOT NULL DEFAULT '',
  valor integer NOT NULL DEFAULT 0,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_por uuid,
  UNIQUE (cliente_id, data, canal, equipe)
);
GRANT SELECT ON public.elora_relatorio_social_seller TO authenticated;
GRANT ALL ON public.elora_relatorio_social_seller TO service_role;
ALTER TABLE public.elora_relatorio_social_seller ENABLE ROW LEVEL SECURITY;
CREATE POLICY social_seller_select ON public.elora_relatorio_social_seller
  FOR SELECT TO authenticated USING (
    public.is_equipe_interna() OR cliente_id = public.cliente_do_usuario() OR public.parceiro_pode_ver_painel(cliente_id)
  );