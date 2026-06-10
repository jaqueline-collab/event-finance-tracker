
-- Fix JWT email-claim trust in app_users / app_user_permissions policies.
-- Replace email-based self-access with strict auth.uid()-based checks.
-- Add a SECURITY DEFINER linker so invited users (user_id NULL) can claim
-- their app_users row on first sign-in via verified auth.uid()+JWT email.

CREATE OR REPLACE FUNCTION public.link_app_user()
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
  UPDATE public.app_users
     SET user_id = _uid
   WHERE lower(email) = _email
     AND user_id IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.link_app_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_app_user() TO authenticated;

-- Tighten app_users SELECT policy: drop email-claim branch.
DROP POLICY IF EXISTS app_users_select_self_or_admin ON public.app_users;
CREATE POLICY app_users_select_self_or_admin
  ON public.app_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_admin());

-- Tighten app_user_permissions SELECT policy: drop email-claim branch.
-- Use a join via app_users.user_id = auth.uid() to confirm identity.
DROP POLICY IF EXISTS perms_select_self_or_admin ON public.app_user_permissions;
CREATE POLICY perms_select_self_or_admin
  ON public.app_user_permissions
  FOR SELECT
  TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.app_users u
      WHERE u.user_id = auth.uid()
        AND lower(u.email) = lower(app_user_permissions.email)
    )
  );
