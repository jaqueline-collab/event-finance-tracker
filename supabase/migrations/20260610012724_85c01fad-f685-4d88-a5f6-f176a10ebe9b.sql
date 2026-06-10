
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.bootstrap_admin_if_empty() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_admin_if_empty() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.link_app_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_app_user() TO authenticated, service_role;
