
REVOKE ALL ON FUNCTION public.bootstrap_admin_if_empty() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_admin_if_empty() TO authenticated;
