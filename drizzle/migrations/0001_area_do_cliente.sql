-- Pessoas com acesso à área do cliente
CREATE TABLE public.elora_cliente_usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id text NOT NULL REFERENCES public.elora_clientes(id) ON DELETE CASCADE,
  email text NOT NULL,
  nome text NOT NULL,
  user_id uuid,
  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cliente_id, email)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.elora_cliente_usuarios TO authenticated;
GRANT ALL ON public.elora_cliente_usuarios TO service_role;

-- Novidades (releases) publicadas pela equipe interna
CREATE TABLE public.elora_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  resumo text,
  conteudo text NOT NULL DEFAULT '',
  tag text NOT NULL DEFAULT 'novidade',
  publicado boolean NOT NULL DEFAULT false,
  para_todos boolean NOT NULL DEFAULT false,
  publicado_em date,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.elora_releases TO authenticated;
GRANT ALL ON public.elora_releases TO service_role;

CREATE TABLE public.elora_release_destinos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id uuid NOT NULL REFERENCES public.elora_releases(id) ON DELETE CASCADE,
  cliente_id text NOT NULL REFERENCES public.elora_clientes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (release_id, cliente_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.elora_release_destinos TO authenticated;
GRANT ALL ON public.elora_release_destinos TO service_role;

-- Funções de papel
CREATE OR REPLACE FUNCTION public.cliente_do_usuario()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cu.cliente_id
  FROM public.elora_cliente_usuarios cu
  WHERE cu.user_id = auth.uid()
    AND cu.ativo = true
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.link_cliente_usuario()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text := lower(coalesce(auth.jwt() ->> 'email', ''));
BEGIN
  IF _uid IS NULL OR _email = '' THEN
    RETURN;
  END IF;
  UPDATE public.elora_cliente_usuarios
     SET user_id = _uid, updated_at = now()
   WHERE lower(email) = _email
     AND (user_id IS NULL OR user_id <> _uid);
END;
$$;

CREATE TRIGGER trg_touch_elora_cliente_usuarios
BEFORE UPDATE ON public.elora_cliente_usuarios
FOR EACH ROW EXECUTE FUNCTION public.touch_elora_parceiro_usuarios();

-- RLS
ALTER TABLE public.elora_cliente_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elora_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elora_release_destinos ENABLE ROW LEVEL SECURITY;

CREATE POLICY cliente_usuarios_select ON public.elora_cliente_usuarios
FOR SELECT TO authenticated
USING (public.is_equipe_interna() OR cliente_id = public.cliente_do_usuario());

CREATE POLICY cliente_usuarios_insert ON public.elora_cliente_usuarios
FOR INSERT TO authenticated
WITH CHECK (public.is_equipe_interna() OR cliente_id = public.cliente_do_usuario());

CREATE POLICY cliente_usuarios_update ON public.elora_cliente_usuarios
FOR UPDATE TO authenticated
USING (public.is_equipe_interna() OR cliente_id = public.cliente_do_usuario())
WITH CHECK (public.is_equipe_interna() OR cliente_id = public.cliente_do_usuario());

CREATE POLICY cliente_usuarios_delete ON public.elora_cliente_usuarios
FOR DELETE TO authenticated
USING (public.is_equipe_interna() OR cliente_id = public.cliente_do_usuario());

CREATE POLICY releases_select ON public.elora_releases
FOR SELECT TO authenticated
USING (
  public.is_equipe_interna()
  OR (
    publicado = true
    AND (
      para_todos = true
      OR EXISTS (
        SELECT 1 FROM public.elora_release_destinos d
        WHERE d.release_id = elora_releases.id
          AND d.cliente_id = public.cliente_do_usuario()
      )
    )
  )
);

CREATE POLICY releases_write ON public.elora_releases
FOR ALL TO authenticated
USING (public.is_equipe_interna())
WITH CHECK (public.is_equipe_interna());

CREATE POLICY release_destinos_select ON public.elora_release_destinos
FOR SELECT TO authenticated
USING (public.is_equipe_interna() OR cliente_id = public.cliente_do_usuario());

CREATE POLICY release_destinos_write ON public.elora_release_destinos
FOR ALL TO authenticated
USING (public.is_equipe_interna())
WITH CHECK (public.is_equipe_interna());

-- O cliente enxerga apenas o próprio cadastro e os próprios movimentos
CREATE POLICY clientes_select_proprio_cliente ON public.elora_clientes
FOR SELECT TO authenticated
USING (id = public.cliente_do_usuario());

CREATE POLICY movimentos_select_proprio_cliente ON public.elora_movimentos
FOR SELECT TO authenticated
USING (cliente_id = public.cliente_do_usuario());