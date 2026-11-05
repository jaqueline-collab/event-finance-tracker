ALTER TABLE public.elora_indicadores_config ADD COLUMN IF NOT EXISTS formato text NOT NULL DEFAULT 'numero';
ALTER TABLE public.elora_indicadores_config ADD COLUMN IF NOT EXISTS formula jsonb;
ALTER TABLE public.elora_indicadores_config ADD CONSTRAINT indicadores_formato_ck CHECK (formato = ANY (ARRAY['numero','percentual','moeda']));
UPDATE public.elora_indicadores_config SET tipo = 'combinada' WHERE tipo = 'app' AND fonte = 'cards';

CREATE TABLE public.elora_matriz_manual (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id text NOT NULL REFERENCES public.elora_clientes(id),
  coluna_chave text NOT NULL,
  data date NOT NULL,
  valor numeric,
  alterado_por text,
  alterado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cliente_id, coluna_chave, data)
);
GRANT ALL ON public.elora_matriz_manual TO service_role;
ALTER TABLE public.elora_matriz_manual ENABLE ROW LEVEL SECURITY;