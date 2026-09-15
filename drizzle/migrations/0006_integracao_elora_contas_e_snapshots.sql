CREATE TABLE public.elora_integracao_contas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id text NOT NULL REFERENCES public.elora_clientes(id) ON DELETE CASCADE,
  base_url text NOT NULL,
  api_key text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  ultima_sync timestamptz,
  ultimo_erro text,
  criado_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cliente_id)
);

GRANT ALL ON public.elora_integracao_contas TO service_role;

ALTER TABLE public.elora_integracao_contas ENABLE ROW LEVEL SECURITY;

CREATE POLICY integracao_contas_service_only
  ON public.elora_integracao_contas
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER trg_touch_elora_integracao_contas
  BEFORE UPDATE ON public.elora_integracao_contas
  FOR EACH ROW EXECUTE FUNCTION public.touch_elora_parceiro_usuarios();

CREATE TABLE public.elora_uso_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id text NOT NULL REFERENCES public.elora_clientes(id) ON DELETE CASCADE,
  data date NOT NULL,
  uso jsonb NOT NULL DEFAULT '{}'::jsonb,
  indicadores jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cliente_id, data)
);

GRANT SELECT ON public.elora_uso_snapshots TO authenticated;
GRANT ALL ON public.elora_uso_snapshots TO service_role;

ALTER TABLE public.elora_uso_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY uso_snapshots_select_interno
  ON public.elora_uso_snapshots
  FOR SELECT TO authenticated
  USING (public.is_equipe_interna());

CREATE POLICY uso_snapshots_select_cliente
  ON public.elora_uso_snapshots
  FOR SELECT TO authenticated
  USING (cliente_id = public.cliente_do_usuario());

CREATE POLICY uso_snapshots_select_parceiro
  ON public.elora_uso_snapshots
  FOR SELECT TO authenticated
  USING (public.parceiro_pode_ver_painel(cliente_id));