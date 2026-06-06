
-- 1. Add user_id link to app_users and backfill from auth.users
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS user_id uuid;
UPDATE public.app_users au
  SET user_id = u.id
  FROM auth.users u
  WHERE au.user_id IS NULL AND lower(u.email) = lower(au.email);
CREATE UNIQUE INDEX IF NOT EXISTS app_users_user_id_uidx
  ON public.app_users(user_id) WHERE user_id IS NOT NULL;

-- 2. New uid-based admin check (SECURITY INVOKER; relies on caller's RLS to see own row)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users
    WHERE user_id = auth.uid() AND is_admin = true
  )
$$;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 3. Replace policies on app_user_permissions
DROP POLICY IF EXISTS perms_admin_delete ON public.app_user_permissions;
DROP POLICY IF EXISTS perms_admin_insert ON public.app_user_permissions;
DROP POLICY IF EXISTS perms_admin_update ON public.app_user_permissions;
DROP POLICY IF EXISTS perms_select_self_or_admin ON public.app_user_permissions;

CREATE POLICY perms_admin_delete ON public.app_user_permissions
  FOR DELETE TO authenticated USING (public.is_admin());
CREATE POLICY perms_admin_insert ON public.app_user_permissions
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY perms_admin_update ON public.app_user_permissions
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY perms_select_self_or_admin ON public.app_user_permissions
  FOR SELECT TO authenticated
  USING (
    lower(email) = lower((auth.jwt() ->> 'email'))
    OR public.is_admin()
  );

-- 4. Replace policies on app_users
DROP POLICY IF EXISTS app_users_admin_delete ON public.app_users;
DROP POLICY IF EXISTS app_users_admin_insert ON public.app_users;
DROP POLICY IF EXISTS app_users_admin_update ON public.app_users;
DROP POLICY IF EXISTS app_users_select_self_or_admin ON public.app_users;

CREATE POLICY app_users_admin_delete ON public.app_users
  FOR DELETE TO authenticated USING (public.is_admin());
CREATE POLICY app_users_admin_insert ON public.app_users
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY app_users_admin_update ON public.app_users
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY app_users_select_self_or_admin ON public.app_users
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR lower(email) = lower((auth.jwt() ->> 'email'))
    OR public.is_admin()
  );

-- 5. Drop the old email-based admin function (no longer referenced)
DROP FUNCTION IF EXISTS public.is_admin_email(text);
