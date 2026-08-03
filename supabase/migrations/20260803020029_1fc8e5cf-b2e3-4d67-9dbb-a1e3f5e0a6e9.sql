-- 1. Toggle de visibilidade de valores por parceiro
ALTER TABLE public.elora_parceiros
  ADD COLUMN IF NOT EXISTS mostrar_valores_cliente boolean NOT NULL DEFAULT false;

-- 2. Pessoas com acesso de parceiro (login individual)
CREATE TABLE public.elora_parceiro_usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parceiro_id text NOT NULL REFERENCES public.elora_parceiros(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  nome text NOT NULL,
  user_id uuid,
  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.elora_parceiro_usuarios TO authenticated;
GRANT ALL ON public.elora_parceiro_usuarios TO service_role;

ALTER TABLE public.elora_parceiro_usuarios ENABLE ROW LEVEL SECURITY;

-- 3. Funções de apoio (security definer, sem recursão de RLS)
CREATE OR REPLACE FUNCTION public.is_equipe_interna()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.app_users WHERE user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.parceiro_do_usuario()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pu.parceiro_id
  FROM public.elora_parceiro_usuarios pu
  WHERE pu.user_id = auth.uid()
    AND pu.ativo = true
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.parceiro_ve_valores()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT p.mostrar_valores_cliente
    FROM public.elora_parceiros p
    WHERE p.id = public.parceiro_do_usuario()
  ), false)
$$;

CREATE OR REPLACE FUNCTION public.link_parceiro_usuario()
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
  UPDATE public.elora_parceiro_usuarios
     SET user_id = _uid, updated_at = now()
   WHERE lower(email) = _email
     AND (user_id IS NULL OR user_id <> _uid);
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_elora_parceiro_usuarios()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_touch_elora_parceiro_usuarios
BEFORE UPDATE ON public.elora_parceiro_usuarios
FOR EACH ROW EXECUTE FUNCTION public.touch_elora_parceiro_usuarios();

-- 4. Políticas da tabela de acessos: admin gerencia, pessoa lê só o próprio
CREATE POLICY parceiro_usuarios_admin_all ON public.elora_parceiro_usuarios
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY parceiro_usuarios_self_select ON public.elora_parceiro_usuarios
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 5. Leitura de clientes e movimentos pelo parceiro
CREATE POLICY parceiro_select_elora_clientes ON public.elora_clientes
  FOR SELECT TO authenticated
  USING (
    public.parceiro_do_usuario() IS NOT NULL
    AND parceiro_id = public.parceiro_do_usuario()
  );

CREATE POLICY parceiro_select_elora_movimentos ON public.elora_movimentos
  FOR SELECT TO authenticated
  USING (
    public.parceiro_do_usuario() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.elora_clientes c
      WHERE c.id = elora_movimentos.cliente_id
        AND c.parceiro_id = public.parceiro_do_usuario()
    )
  );

-- 6. Parceiro lê apenas o próprio cadastro
CREATE POLICY parceiro_select_proprio ON public.elora_parceiros
  FOR SELECT TO authenticated
  USING (
    public.parceiro_do_usuario() IS NOT NULL
    AND id = public.parceiro_do_usuario()
  );

-- 7. Custo WTS: bloqueio permanente para parceiro
DROP POLICY IF EXISTS custos_wts_select_authenticated ON public.elora_custos_wts;
CREATE POLICY custos_wts_select_interno ON public.elora_custos_wts
  FOR SELECT TO authenticated
  USING (public.is_equipe_interna());

-- 8. Catálogo de planos sem colunas de custo
CREATE VIEW public.elora_planos_parceiro
WITH (security_invoker = off) AS
  SELECT
    id,
    nome,
    categoria,
    cobranca,
    canais_inclusos,
    canais_whats_inclusos,
    canais_insta_inclusos,
    canais_messenger_inclusos,
    usuarios_inclusos,
    contatos_inclusos,
    inclui_ia,
    inclui_asaas,
    inclui_zapi,
    inclui_transcricao,
    dia_vencimento,
    ciclo_dia_inicial,
    ciclo_dia_final
  FROM public.elora_planos;

GRANT SELECT ON public.elora_planos_parceiro TO authenticated;
GRANT SELECT ON public.elora_planos_parceiro TO service_role;