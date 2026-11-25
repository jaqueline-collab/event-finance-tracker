ALTER TABLE public.elora_sync_estado
ADD COLUMN IF NOT EXISTS cobertura jsonb NOT NULL DEFAULT '[]'::jsonb;