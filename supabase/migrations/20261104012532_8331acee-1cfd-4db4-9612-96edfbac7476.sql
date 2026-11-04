CREATE TABLE public.elora_credenciais (
  cliente_id text PRIMARY KEY REFERENCES public.elora_clientes(id) ON DELETE CASCADE,
  chave_cifrada text NOT NULL,
  versao_chave smallint NOT NULL DEFAULT 1,
  ultimos4 text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  rotacionada_em timestamptz
);
REVOKE ALL ON public.elora_credenciais FROM anon, authenticated;
GRANT ALL ON public.elora_credenciais TO service_role;
ALTER TABLE public.elora_credenciais ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.elora_credenciais_uso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id text NOT NULL REFERENCES public.elora_clientes(id) ON DELETE CASCADE,
  evento text NOT NULL CHECK (evento IN ('sincronizacao','teste','troca','migracao','leitura_automacao')),
  ok boolean NOT NULL DEFAULT true,
  detalhe text,
  user_id uuid,
  criado_em timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.elora_credenciais_uso FROM anon, authenticated;
GRANT SELECT ON public.elora_credenciais_uso TO authenticated;
GRANT ALL ON public.elora_credenciais_uso TO service_role;
ALTER TABLE public.elora_credenciais_uso ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipe interna le log de credenciais" ON public.elora_credenciais_uso
  FOR SELECT TO authenticated USING (public.is_equipe_interna());

ALTER TABLE public.elora_integracao_contas ALTER COLUMN api_key DROP NOT NULL;

CREATE TABLE public.elora_dados_config (
  cliente_id text PRIMARY KEY REFERENCES public.elora_clientes(id) ON DELETE CASCADE,
  historico_desde date NOT NULL,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_por uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.elora_dados_config TO authenticated;
GRANT ALL ON public.elora_dados_config TO service_role;
ALTER TABLE public.elora_dados_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipe interna gerencia config de dados" ON public.elora_dados_config
  FOR ALL TO authenticated USING (public.is_equipe_interna()) WITH CHECK (public.is_equipe_interna());

CREATE TABLE public.elora_dados_canais_permitidos (
  cliente_id text NOT NULL REFERENCES public.elora_clientes(id) ON DELETE CASCADE,
  canal_id uuid NOT NULL,
  nome text,
  numero text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cliente_id, canal_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.elora_dados_canais_permitidos TO authenticated;
GRANT ALL ON public.elora_dados_canais_permitidos TO service_role;
ALTER TABLE public.elora_dados_canais_permitidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipe interna gerencia canais permitidos" ON public.elora_dados_canais_permitidos
  FOR ALL TO authenticated USING (public.is_equipe_interna()) WITH CHECK (public.is_equipe_interna());