
DROP FUNCTION IF EXISTS public.bootstrap_admin_if_empty(text);

CREATE OR REPLACE FUNCTION public.bootstrap_admin_if_empty()
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
  IF NOT EXISTS (SELECT 1 FROM public.app_users) THEN
    INSERT INTO public.app_users (email, is_admin, display_name, user_id)
    VALUES (_email, true, _email, _uid)
    ON CONFLICT (email) DO UPDATE SET is_admin = true, user_id = EXCLUDED.user_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_admin_if_empty() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_admin_if_empty() TO authenticated;
