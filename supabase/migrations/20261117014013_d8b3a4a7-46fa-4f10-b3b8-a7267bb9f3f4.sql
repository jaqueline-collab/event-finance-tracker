ALTER TABLE public.elora_sync_estado
  ADD COLUMN IF NOT EXISTS ultima_execucao_em timestamptz,
  ADD COLUMN IF NOT EXISTS ultima_execucao_concluida boolean,
  ADD COLUMN IF NOT EXISTS ultima_execucao_registros integer,
  ADD COLUMN IF NOT EXISTS ultima_execucao_situacao text,
  ADD COLUMN IF NOT EXISTS ultimo_registro_em timestamptz;

CREATE TABLE public.elora_checagem_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id text NOT NULL REFERENCES public.elora_clientes(id) ON DELETE CASCADE,
  checado_em timestamptz NOT NULL DEFAULT now(),
  dia date NOT NULL,
  amostra integer NOT NULL DEFAULT 0,
  nosso integer NOT NULL DEFAULT 0,
  elora integer NOT NULL DEFAULT 0,
  diferenca integer NOT NULL DEFAULT 0
);
GRANT ALL ON public.elora_checagem_mensagens TO service_role;
ALTER TABLE public.elora_checagem_mensagens ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.elora_checagem_mensagens (cliente_id, checado_em DESC);

-- Correção pontual: cursor de mensagens preso recomeça da última conclusão menos 2 horas.
UPDATE public.elora_sync_estado
   SET cursor = jsonb_build_object('desde', to_char((concluido_em - interval '2 hours') AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'dias', coalesce(cursor->'dias','[]'::jsonb), 'v', 2)
 WHERE fonte = 'mensagens' AND concluido_em IS NOT NULL AND cursor ? 'etapa';