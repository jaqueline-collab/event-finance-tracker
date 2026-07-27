ALTER TABLE public.elora_fechamentos ADD COLUMN IF NOT EXISTS deletado_em timestamptz;
CREATE INDEX IF NOT EXISTS idx_elora_fechamentos_deletado_em ON public.elora_fechamentos (deletado_em);