ALTER TABLE public.elora_fechamento_itens
  ALTER COLUMN lancamento_financeiro_id TYPE text
  USING lancamento_financeiro_id::text;