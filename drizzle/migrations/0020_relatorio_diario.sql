ALTER TABLE public.elora_integracao_contas
  ADD COLUMN relatorio_diario_ativo boolean NOT NULL DEFAULT false;

CREATE TABLE public.elora_relatorio_diario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id text NOT NULL REFERENCES public.elora_clientes(id),
  data date NOT NULL,
  novos_contatos integer NOT NULL DEFAULT 0,
  novos_contatos_ads integer NOT NULL DEFAULT 0,
  conversas_usuario integer NOT NULL DEFAULT 0,
  conversas_bot integer NOT NULL DEFAULT 0,
  consulta_agendada integer NOT NULL DEFAULT 0,
  consulta_agendada_ads integer NOT NULL DEFAULT 0,
  procedimento_vendido integer NOT NULL DEFAULT 0,
  procedimento_vendido_ads integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cliente_id, data)
);

CREATE INDEX idx_relatorio_diario_cliente_data
  ON public.elora_relatorio_diario (cliente_id, data DESC);

GRANT SELECT ON public.elora_relatorio_diario TO authenticated;
GRANT ALL ON public.elora_relatorio_diario TO service_role;

ALTER TABLE public.elora_relatorio_diario ENABLE ROW LEVEL SECURITY;

CREATE POLICY relatorio_diario_select_interno ON public.elora_relatorio_diario
  FOR SELECT TO authenticated USING (public.is_equipe_interna());

CREATE POLICY relatorio_diario_select_cliente ON public.elora_relatorio_diario
  FOR SELECT TO authenticated USING (cliente_id = public.cliente_do_usuario());

CREATE POLICY relatorio_diario_select_parceiro ON public.elora_relatorio_diario
  FOR SELECT TO authenticated USING (public.parceiro_pode_ver_painel(cliente_id));

CREATE TRIGGER trg_touch_elora_relatorio_diario
  BEFORE UPDATE ON public.elora_relatorio_diario
  FOR EACH ROW EXECUTE FUNCTION public.touch_elora_parceiro_usuarios();