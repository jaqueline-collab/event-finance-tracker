ALTER TABLE public.elora_movimentos
  ADD COLUMN IF NOT EXISTS canais_whats integer,
  ADD COLUMN IF NOT EXISTS canais_insta integer,
  ADD COLUMN IF NOT EXISTS canais_messenger integer;