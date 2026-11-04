ALTER TABLE public.elora_dados_canais_permitidos
  ADD COLUMN IF NOT EXISTS apelido text,
  ADD COLUMN IF NOT EXISTS permitido boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS tipo text;