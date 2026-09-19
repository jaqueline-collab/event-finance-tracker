ALTER TABLE public.elora_movimentos
  ADD COLUMN IF NOT EXISTS parceiro_anterior_id text,
  ADD COLUMN IF NOT EXISTS parceiro_novo_id text;