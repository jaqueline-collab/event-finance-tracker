REVOKE EXECUTE ON FUNCTION public.is_admin_email(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_email(TEXT) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.bootstrap_admin_if_empty(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_admin_if_empty(TEXT) TO authenticated, service_role;