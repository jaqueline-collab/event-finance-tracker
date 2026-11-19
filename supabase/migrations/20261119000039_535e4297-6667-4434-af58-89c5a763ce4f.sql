ALTER TABLE public.elora_cards_espelho ADD COLUMN IF NOT EXISTS excluido_em timestamptz;
CREATE INDEX IF NOT EXISTS elora_cards_espelho_excluidos ON public.elora_cards_espelho (cliente_id) WHERE excluido_em IS NOT NULL;
ALTER TABLE public.elora_conferencias ADD COLUMN IF NOT EXISTS exclusoes jsonb;