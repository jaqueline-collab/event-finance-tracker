REVOKE EXECUTE ON FUNCTION public.is_equipe_interna() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.parceiro_do_usuario() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.parceiro_ve_valores() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.link_parceiro_usuario() FROM anon, PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_equipe_interna() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.parceiro_do_usuario() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.parceiro_ve_valores() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.link_parceiro_usuario() TO authenticated, service_role;

REVOKE ALL ON public.elora_planos_parceiro FROM anon, PUBLIC;
GRANT SELECT ON public.elora_planos_parceiro TO authenticated, service_role;