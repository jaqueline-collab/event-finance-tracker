CREATE OR REPLACE FUNCTION public.elora_ultimo_humano_sessao(_cliente_id text, _excluir text[] DEFAULT '{}')
 RETURNS TABLE(sessao_id text, humano_user text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT DISTINCT ON (me.sessao_id) me.sessao_id::text, me.user_id_elora::text
  FROM public.elora_mensagens_espelho me
  WHERE me.cliente_id = _cliente_id AND me.direcao = 'TO_HUB'
    AND (me.tipo IS NULL OR me.tipo NOT IN ('NOTE','TRANSITION','TRACK'))
    AND me.user_id_elora IS NOT NULL AND me.user_id_elora::text <> ''
    AND coalesce(me.payload->>'origin','') NOT IN ('BOT','CAMPAIGN','OFFICE_HOURS','API','PAYMENT')
    AND NOT (me.user_id_elora::text = ANY(coalesce(_excluir, '{}')))
  ORDER BY me.sessao_id, me.enviada_em DESC, me.externo_id ASC
$function$;
REVOKE ALL ON FUNCTION public.elora_ultimo_humano_sessao(text, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.elora_ultimo_humano_sessao(text, text[]) TO service_role;