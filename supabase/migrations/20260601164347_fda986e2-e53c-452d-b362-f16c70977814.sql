
ALTER TABLE public.elora_planos
  ADD COLUMN IF NOT EXISTS canais_whats_inclusos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS canais_insta_inclusos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS canais_messenger_inclusos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preco_canal_whats_exc numeric NOT NULL DEFAULT 29.90,
  ADD COLUMN IF NOT EXISTS preco_canal_insta_exc numeric NOT NULL DEFAULT 29.90,
  ADD COLUMN IF NOT EXISTS preco_canal_messenger_exc numeric NOT NULL DEFAULT 29.90,
  ADD COLUMN IF NOT EXISTS valor_canal_whats_exc numeric NOT NULL DEFAULT 59.90,
  ADD COLUMN IF NOT EXISTS valor_canal_insta_exc numeric NOT NULL DEFAULT 59.90,
  ADD COLUMN IF NOT EXISTS valor_canal_messenger_exc numeric NOT NULL DEFAULT 59.90;
