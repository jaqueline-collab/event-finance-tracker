CREATE TABLE public.elora_paineis_incorporados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id text NOT NULL REFERENCES public.elora_clientes(id) ON DELETE CASCADE,
  visao_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  dados_pessoais boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now(),
  criado_por uuid,
  revogado_em timestamptz,
  ultimo_acesso_em timestamptz
);
CREATE UNIQUE INDEX elora_paineis_incorporados_ativo ON public.elora_paineis_incorporados (cliente_id, visao_id) WHERE revogado_em IS NULL;
GRANT ALL ON public.elora_paineis_incorporados TO service_role;
ALTER TABLE public.elora_paineis_incorporados ENABLE ROW LEVEL SECURITY;