-- 1. Tabela de usuários do app
CREATE TABLE public.app_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  display_name TEXT,
  invited_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_users TO authenticated;
GRANT ALL ON public.app_users TO service_role;

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- 2. Função security definer para checar admin
CREATE OR REPLACE FUNCTION public.is_admin_email(_email TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users
    WHERE lower(email) = lower(_email) AND is_admin = true
  )
$$;

-- 3. Função para auto-promover o primeiro usuário a admin (bootstrap)
CREATE OR REPLACE FUNCTION public.bootstrap_admin_if_empty(_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.app_users) THEN
    INSERT INTO public.app_users (email, is_admin, display_name)
    VALUES (lower(_email), true, _email)
    ON CONFLICT (email) DO UPDATE SET is_admin = true;
  END IF;
END;
$$;

-- 4. RLS — admins fazem tudo; cada um vê o próprio registro
CREATE POLICY "app_users_select_self_or_admin"
  ON public.app_users FOR SELECT TO authenticated
  USING (
    lower(email) = lower(auth.jwt() ->> 'email')
    OR public.is_admin_email(auth.jwt() ->> 'email')
  );

CREATE POLICY "app_users_admin_insert"
  ON public.app_users FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_email(auth.jwt() ->> 'email'));

CREATE POLICY "app_users_admin_update"
  ON public.app_users FOR UPDATE TO authenticated
  USING (public.is_admin_email(auth.jwt() ->> 'email'))
  WITH CHECK (public.is_admin_email(auth.jwt() ->> 'email'));

CREATE POLICY "app_users_admin_delete"
  ON public.app_users FOR DELETE TO authenticated
  USING (public.is_admin_email(auth.jwt() ->> 'email'));

-- 5. Tabela de permissões por módulo
CREATE TABLE public.app_user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  module TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (email, module)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_user_permissions TO authenticated;
GRANT ALL ON public.app_user_permissions TO service_role;

ALTER TABLE public.app_user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perms_select_self_or_admin"
  ON public.app_user_permissions FOR SELECT TO authenticated
  USING (
    lower(email) = lower(auth.jwt() ->> 'email')
    OR public.is_admin_email(auth.jwt() ->> 'email')
  );

CREATE POLICY "perms_admin_insert"
  ON public.app_user_permissions FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_email(auth.jwt() ->> 'email'));

CREATE POLICY "perms_admin_update"
  ON public.app_user_permissions FOR UPDATE TO authenticated
  USING (public.is_admin_email(auth.jwt() ->> 'email'))
  WITH CHECK (public.is_admin_email(auth.jwt() ->> 'email'));

CREATE POLICY "perms_admin_delete"
  ON public.app_user_permissions FOR DELETE TO authenticated
  USING (public.is_admin_email(auth.jwt() ->> 'email'));