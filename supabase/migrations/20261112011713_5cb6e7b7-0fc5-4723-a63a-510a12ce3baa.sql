CREATE TABLE public.elora_campos_ajustes (
  cliente_id text NOT NULL,
  fonte text NOT NULL CHECK (fonte IN ('contato','atendimento','card','utm')),
  campo text NOT NULL,
  rotulo text,
  oculto boolean NOT NULL DEFAULT false,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_por text,
  PRIMARY KEY (cliente_id, fonte, campo)
);
GRANT ALL ON public.elora_campos_ajustes TO service_role;
ALTER TABLE public.elora_campos_ajustes ENABLE ROW LEVEL SECURITY;