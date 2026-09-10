CREATE TABLE public.elora_notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id text REFERENCES public.elora_clientes(id) ON DELETE CASCADE,
  parceiro_id text REFERENCES public.elora_parceiros(id) ON DELETE CASCADE,
  para_todos boolean NOT NULL DEFAULT false,
  titulo text NOT NULL,
  texto text,
  link text,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.elora_notificacoes_lidas (
  notificacao_id uuid NOT NULL REFERENCES public.elora_notificacoes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  lida_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notificacao_id, user_id)
);

CREATE INDEX idx_elora_notificacoes_created ON public.elora_notificacoes (created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.elora_notificacoes TO authenticated;
GRANT ALL ON public.elora_notificacoes TO service_role;
GRANT SELECT, INSERT, DELETE ON public.elora_notificacoes_lidas TO authenticated;
GRANT ALL ON public.elora_notificacoes_lidas TO service_role;

ALTER TABLE public.elora_notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elora_notificacoes_lidas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ver notificacoes destinadas a mim"
ON public.elora_notificacoes FOR SELECT TO authenticated
USING (
  para_todos = true
  OR user_id = auth.uid()
  OR (cliente_id IS NOT NULL AND cliente_id = public.cliente_do_usuario())
  OR (parceiro_id IS NOT NULL AND parceiro_id = public.parceiro_do_usuario())
  OR public.is_equipe_interna()
);

CREATE POLICY "equipe interna cria notificacoes"
ON public.elora_notificacoes FOR INSERT TO authenticated
WITH CHECK (public.is_equipe_interna());

CREATE POLICY "equipe interna atualiza notificacoes"
ON public.elora_notificacoes FOR UPDATE TO authenticated
USING (public.is_equipe_interna()) WITH CHECK (public.is_equipe_interna());

CREATE POLICY "equipe interna apaga notificacoes"
ON public.elora_notificacoes FOR DELETE TO authenticated
USING (public.is_equipe_interna());

CREATE POLICY "ver minhas leituras"
ON public.elora_notificacoes_lidas FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "marcar como lida"
ON public.elora_notificacoes_lidas FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "desmarcar leitura"
ON public.elora_notificacoes_lidas FOR DELETE TO authenticated
USING (user_id = auth.uid());