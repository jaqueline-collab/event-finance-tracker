CREATE TABLE public.elora_ia_config (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  ligado boolean NOT NULL DEFAULT true,
  modelo text NOT NULL DEFAULT 'openai/gpt-5.6-luna',
  limite_diario int NOT NULL DEFAULT 30,
  max_pergunta int NOT NULL DEFAULT 1000,
  max_resposta_tokens int NOT NULL DEFAULT 1500,
  retencao_dias int NOT NULL DEFAULT 90,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_por uuid
);
GRANT ALL ON public.elora_ia_config TO service_role;
ALTER TABLE public.elora_ia_config ENABLE ROW LEVEL SECURITY;
INSERT INTO public.elora_ia_config (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE public.elora_ia_conversas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  area text NOT NULL,
  cliente_id text,
  clientes_consultados text[] NOT NULL DEFAULT '{}',
  pergunta text NOT NULL,
  resposta text,
  ferramentas jsonb NOT NULL DEFAULT '[]',
  tokens_entrada int,
  tokens_saida int,
  modelo text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.elora_ia_conversas TO service_role;
ALTER TABLE public.elora_ia_conversas ENABLE ROW LEVEL SECURITY;
CREATE INDEX elora_ia_conversas_usuario_dia ON public.elora_ia_conversas (usuario_id, criado_em);
CREATE INDEX elora_ia_conversas_criado ON public.elora_ia_conversas (criado_em);

CREATE TABLE public.elora_ia_guia_cache (
  url text PRIMARY KEY,
  conteudo text NOT NULL,
  lido_em timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.elora_ia_guia_cache TO service_role;
ALTER TABLE public.elora_ia_guia_cache ENABLE ROW LEVEL SECURITY;