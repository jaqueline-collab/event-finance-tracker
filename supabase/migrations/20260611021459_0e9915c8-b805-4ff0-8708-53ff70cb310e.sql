ALTER TABLE public.elora_planos
  ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'elora',
  ADD COLUMN IF NOT EXISTS cobranca text NOT NULL DEFAULT 'recorrente',
  ADD COLUMN IF NOT EXISTS duracao_valor integer,
  ADD COLUMN IF NOT EXISTS duracao_unidade text;

ALTER TABLE public.elora_planos
  DROP CONSTRAINT IF EXISTS elora_planos_categoria_chk;
ALTER TABLE public.elora_planos
  ADD CONSTRAINT elora_planos_categoria_chk CHECK (categoria IN ('elora','consultoria'));

ALTER TABLE public.elora_planos
  DROP CONSTRAINT IF EXISTS elora_planos_cobranca_chk;
ALTER TABLE public.elora_planos
  ADD CONSTRAINT elora_planos_cobranca_chk CHECK (cobranca IN ('recorrente','unica'));

ALTER TABLE public.elora_planos
  DROP CONSTRAINT IF EXISTS elora_planos_duracao_unidade_chk;
ALTER TABLE public.elora_planos
  ADD CONSTRAINT elora_planos_duracao_unidade_chk CHECK (duracao_unidade IS NULL OR duracao_unidade IN ('dias','meses','anos'));