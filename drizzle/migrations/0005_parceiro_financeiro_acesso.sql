ALTER TABLE public.elora_parceiros
  ADD COLUMN IF NOT EXISTS pode_ver_fechamentos boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS site_url text;

ALTER TABLE public.elora_fechamentos
  ADD COLUMN IF NOT EXISTS enviado_parceiro_em timestamptz,
  ADD COLUMN IF NOT EXISTS enviado_parceiro_por uuid;