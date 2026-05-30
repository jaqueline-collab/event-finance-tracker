
-- Helper function to apply RLS uniformly
CREATE TABLE public.elora_custos (
  id text PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo text NOT NULL,
  custo_unitario numeric NOT NULL DEFAULT 0,
  preco_cliente numeric NOT NULL DEFAULT 0,
  unidade text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.elora_planos (
  id text PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  valor_mensal numeric DEFAULT 0,
  valor_setup numeric DEFAULT 0,
  canais_inclusos integer DEFAULT 1,
  usuarios_inclusos integer DEFAULT 3,
  contatos_inclusos integer DEFAULT 500,
  inclui_ia boolean DEFAULT false,
  inclui_asaas boolean DEFAULT false,
  inclui_zapi integer DEFAULT 0,
  inclui_transcricao boolean DEFAULT false,
  licenca_base numeric DEFAULT 149.90,
  preco_canais_exc numeric DEFAULT 29.90,
  preco_usuarios_exc numeric DEFAULT 19.90,
  preco_contatos_exc numeric DEFAULT 0.045,
  preco_ia numeric DEFAULT 50,
  preco_asaas numeric DEFAULT 49.50,
  preco_zapi numeric DEFAULT 69,
  preco_transcricao_user numeric DEFAULT 3.99,
  valor_canais_exc numeric DEFAULT 59.90,
  valor_usuarios_exc numeric DEFAULT 39.90,
  valor_contatos_exc numeric DEFAULT 0.10,
  valor_ia numeric DEFAULT 99,
  valor_asaas numeric DEFAULT 89,
  valor_zapi numeric DEFAULT 149,
  valor_transcricao_user numeric DEFAULT 7.99,
  parceiro_ids jsonb DEFAULT '[]'::jsonb,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.elora_parceiros (
  id text PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text,
  celular text,
  planos_vinculados jsonb DEFAULT '[]'::jsonb,
  observacao text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.elora_clientes (
  id text PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  plano_id text,
  parceiro_id text,
  data_inicio date,
  data_vencimento date,
  data_churn date,
  apps integer DEFAULT 0,
  mau integer DEFAULT 0,
  canais integer DEFAULT 1,
  canais_zapi integer DEFAULT 0,
  canais_whats integer DEFAULT 0,
  canais_insta integer DEFAULT 0,
  canais_messenger integer DEFAULT 0,
  usuarios_ativos integer DEFAULT 3,
  contatos_ativos integer DEFAULT 500,
  agentes_ia boolean DEFAULT false,
  asaas boolean DEFAULT false,
  zapi boolean DEFAULT false,
  transcricao_ia boolean DEFAULT false,
  valor_setup_pago numeric DEFAULT 0,
  valor_acompanhamento numeric DEFAULT 0,
  extras jsonb DEFAULT '{}'::jsonb,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.elora_movimentos (
  id text PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id text NOT NULL,
  data date NOT NULL,
  tipo text NOT NULL,
  plano_id text,
  apps integer,
  mau integer,
  canais integer,
  usuarios_ativos integer,
  contatos_ativos integer,
  agentes_ia boolean,
  asaas boolean,
  zapi boolean,
  transcricao_ia boolean,
  extras jsonb,
  valor_servico numeric,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.elora_custos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.elora_planos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.elora_parceiros TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.elora_clientes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.elora_movimentos TO authenticated;
GRANT ALL ON public.elora_custos, public.elora_planos, public.elora_parceiros, public.elora_clientes, public.elora_movimentos TO service_role;

-- RLS
ALTER TABLE public.elora_custos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elora_planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elora_parceiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elora_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elora_movimentos ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['elora_custos','elora_planos','elora_parceiros','elora_clientes','elora_movimentos'] LOOP
    EXECUTE format('CREATE POLICY "own_select_%1$s" ON public.%1$I FOR SELECT TO authenticated USING (user_id = auth.uid());', t);
    EXECUTE format('CREATE POLICY "own_insert_%1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());', t);
    EXECUTE format('CREATE POLICY "own_update_%1$s" ON public.%1$I FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());', t);
    EXECUTE format('CREATE POLICY "own_delete_%1$s" ON public.%1$I FOR DELETE TO authenticated USING (user_id = auth.uid());', t);
  END LOOP;
END $$;
