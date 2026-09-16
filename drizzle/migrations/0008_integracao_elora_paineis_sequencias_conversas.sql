-- Painéis sincronizados da conta do app Elora
CREATE TABLE public.elora_paineis_sincronizados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id text NOT NULL REFERENCES public.elora_clientes(id) ON DELETE CASCADE,
  painel_id text NOT NULL,
  titulo text,
  tipo text,
  etapas jsonb NOT NULL DEFAULT '[]'::jsonb,
  campos_personalizados jsonb NOT NULL DEFAULT '[]'::jsonb,
  sincronizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cliente_id, painel_id)
);

GRANT SELECT ON public.elora_paineis_sincronizados TO authenticated;
GRANT ALL ON public.elora_paineis_sincronizados TO service_role;

ALTER TABLE public.elora_paineis_sincronizados ENABLE ROW LEVEL SECURITY;

CREATE POLICY paineis_select_interno ON public.elora_paineis_sincronizados
  FOR SELECT TO authenticated USING (public.is_equipe_interna());
CREATE POLICY paineis_select_cliente ON public.elora_paineis_sincronizados
  FOR SELECT TO authenticated USING (cliente_id = public.cliente_do_usuario());
CREATE POLICY paineis_select_parceiro ON public.elora_paineis_sincronizados
  FOR SELECT TO authenticated USING (public.parceiro_pode_ver_painel(cliente_id));

-- Sequências sincronizadas
CREATE TABLE public.elora_sequencias_sincronizadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id text NOT NULL REFERENCES public.elora_clientes(id) ON DELETE CASCADE,
  sequencia_id text NOT NULL,
  nome text,
  sincronizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cliente_id, sequencia_id)
);

GRANT SELECT ON public.elora_sequencias_sincronizadas TO authenticated;
GRANT ALL ON public.elora_sequencias_sincronizadas TO service_role;

ALTER TABLE public.elora_sequencias_sincronizadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY sequencias_select_interno ON public.elora_sequencias_sincronizadas
  FOR SELECT TO authenticated USING (public.is_equipe_interna());
CREATE POLICY sequencias_select_cliente ON public.elora_sequencias_sincronizadas
  FOR SELECT TO authenticated USING (cliente_id = public.cliente_do_usuario());
CREATE POLICY sequencias_select_parceiro ON public.elora_sequencias_sincronizadas
  FOR SELECT TO authenticated USING (public.parceiro_pode_ver_painel(cliente_id));

-- Conversas classificadas (upsert por cliente + sessão, sem duplicar)
CREATE TABLE public.elora_conversas_classificadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id text NOT NULL REFERENCES public.elora_clientes(id) ON DELETE CASCADE,
  sessao_id text NOT NULL,
  category text,
  category_name text,
  criado_em timestamptz,
  atualizado_em timestamptz,
  teve_resposta boolean NOT NULL DEFAULT false,
  sincronizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cliente_id, sessao_id)
);

CREATE INDEX idx_conversas_cliente_data ON public.elora_conversas_classificadas (cliente_id, criado_em DESC);

GRANT SELECT ON public.elora_conversas_classificadas TO authenticated;
GRANT ALL ON public.elora_conversas_classificadas TO service_role;

ALTER TABLE public.elora_conversas_classificadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversas_select_interno ON public.elora_conversas_classificadas
  FOR SELECT TO authenticated USING (public.is_equipe_interna());
CREATE POLICY conversas_select_cliente ON public.elora_conversas_classificadas
  FOR SELECT TO authenticated USING (cliente_id = public.cliente_do_usuario());
CREATE POLICY conversas_select_parceiro ON public.elora_conversas_classificadas
  FOR SELECT TO authenticated USING (public.parceiro_pode_ver_painel(cliente_id));

-- Mapeamento de classificações e filtros por cliente
ALTER TABLE public.elora_integracao_contas
  ADD COLUMN classificacao_consulta_agendada text,
  ADD COLUMN classificacao_procedimento_vendido text,
  ADD COLUMN filtro_usuarios jsonb,
  ADD COLUMN filtro_etiquetas jsonb,
  ADD COLUMN filtro_campo_personalizado jsonb,
  ADD COLUMN filtro_etapas_funil jsonb,
  ADD COLUMN filtro_campanha text,
  ADD COLUMN sync_conversas_ultima timestamptz;