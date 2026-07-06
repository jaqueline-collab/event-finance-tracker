REVOKE EXECUTE ON FUNCTION public.bootstrap_admin_if_empty() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.link_app_user() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_admin_if_empty() TO service_role;
GRANT EXECUTE ON FUNCTION public.link_app_user() TO service_role;