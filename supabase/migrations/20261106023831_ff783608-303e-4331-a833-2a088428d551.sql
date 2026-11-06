CREATE TABLE public.elora_fechamento_edicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fechamento_id uuid NOT NULL REFERENCES public.elora_fechamentos(id) ON DELETE CASCADE,
  item_id uuid NULL,
  campo text NOT NULL,
  valor_antigo jsonb NULL,
  valor_novo jsonb NULL,
  motivo text NULL,
  editado_por uuid NULL,
  editado_em timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.elora_fechamento_edicoes TO service_role;
ALTER TABLE public.elora_fechamento_edicoes ENABLE ROW LEVEL SECURITY;
CREATE INDEX elora_fechamento_edicoes_fech_idx ON public.elora_fechamento_edicoes(fechamento_id, editado_em DESC);
ALTER TABLE public.elora_fechamentos ADD COLUMN IF NOT EXISTS editado_em timestamptz NULL, ADD COLUMN IF NOT EXISTS editado_por uuid NULL;
ALTER TABLE public.elora_fechamento_itens ADD COLUMN IF NOT EXISTS removido_em timestamptz NULL, ADD COLUMN IF NOT EXISTS removido_por uuid NULL;