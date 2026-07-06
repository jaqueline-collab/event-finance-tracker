ALTER TABLE public.elora_fechamento_itens
  ALTER COLUMN cliente_id TYPE text USING cliente_id::text,
  ALTER COLUMN plano_id TYPE text USING plano_id::text;