CREATE TABLE public.elora_retratos_conversas_dia (
  id bigserial PRIMARY KEY,
  cliente_id text NOT NULL,
  retrato_em timestamptz NOT NULL DEFAULT now(),
  motivo text NOT NULL DEFAULT '',
  periodo_de date NOT NULL,
  periodo_ate date NOT NULL,
  dia date NOT NULL,
  conversas integer NOT NULL,
  usuario integer NOT NULL,
  bot integer NOT NULL,
  mensagens integer NOT NULL
);
CREATE INDEX elora_retratos_conversas_dia_idx ON public.elora_retratos_conversas_dia (cliente_id, retrato_em, dia);
ALTER TABLE public.elora_retratos_conversas_dia ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.elora_retratos_conversas_dia FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.elora_retratos_conversas_dia TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.elora_retratos_conversas_dia_id_seq TO service_role;