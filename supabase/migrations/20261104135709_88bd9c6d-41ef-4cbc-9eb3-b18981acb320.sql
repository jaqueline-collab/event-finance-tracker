
CREATE TABLE public.elora_contatos_espelho (
  cliente_id text NOT NULL REFERENCES public.elora_clientes(id) ON DELETE CASCADE,
  externo_id text NOT NULL,
  nome text, telefone text, status text,
  etiquetas text[] NOT NULL DEFAULT '{}',
  utm_source text, utm_medium text, utm_campaign text,
  origem text,
  criado_em timestamptz, atualizado_em timestamptz,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  sincronizado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cliente_id, externo_id)
);
CREATE TABLE public.elora_atendimentos_espelho (
  cliente_id text NOT NULL REFERENCES public.elora_clientes(id) ON DELETE CASCADE,
  externo_id text NOT NULL,
  contato_id text, canal_id text, canal_nome text, canal_tipo text,
  status text, classificacao text, valor numeric,
  atendente_id text, atendente_nome text, departamento_id text,
  origem text, utm_source text, utm_medium text, utm_campaign text,
  criado_em timestamptz, atualizado_em timestamptz, encerrado_em timestamptz,
  first_response_at timestamptz, time_wait_segundos integer, time_service_segundos integer,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  sincronizado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cliente_id, externo_id)
);
CREATE INDEX ON public.elora_atendimentos_espelho (cliente_id, criado_em);
CREATE INDEX ON public.elora_contatos_espelho (cliente_id, criado_em);
CREATE TABLE public.elora_apoio_espelho (
  cliente_id text NOT NULL REFERENCES public.elora_clientes(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  externo_id text NOT NULL,
  nome text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  sincronizado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cliente_id, tipo, externo_id)
);
CREATE TABLE public.elora_mensagens_espelho (
  cliente_id text NOT NULL REFERENCES public.elora_clientes(id) ON DELETE CASCADE,
  externo_id text NOT NULL,
  sessao_id text NOT NULL,
  direcao text, tipo text, user_id_elora text, eh_bot boolean,
  enviada_em timestamptz,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  sincronizado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cliente_id, externo_id)
);
CREATE INDEX ON public.elora_mensagens_espelho (cliente_id, sessao_id);
CREATE TABLE public.elora_sync_estado (
  cliente_id text NOT NULL REFERENCES public.elora_clientes(id) ON DELETE CASCADE,
  fonte text NOT NULL,
  cursor jsonb NOT NULL DEFAULT '{}'::jsonb,
  chamadas integer NOT NULL DEFAULT 0,
  retentativas integer NOT NULL DEFAULT 0,
  erros jsonb NOT NULL DEFAULT '[]'::jsonb,
  registros integer NOT NULL DEFAULT 0,
  iniciado_em timestamptz, concluido_em timestamptz,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cliente_id, fonte)
);
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['elora_contatos_espelho','elora_atendimentos_espelho','elora_apoio_espelho','elora_mensagens_espelho','elora_sync_estado'] LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
