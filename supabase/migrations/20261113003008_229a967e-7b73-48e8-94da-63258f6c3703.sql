CREATE TABLE IF NOT EXISTS public.elora_config_acoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id text NOT NULL,
  usuario_id uuid,
  usuario_email text,
  alvo text NOT NULL,
  descricao text,
  antes jsonb,
  depois jsonb,
  desfeita_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.elora_config_acoes TO service_role;
ALTER TABLE public.elora_config_acoes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS elora_config_acoes_cliente_idx ON public.elora_config_acoes (cliente_id, created_at DESC);