DROP FUNCTION IF EXISTS public.elora_conversas_pares(text, timestamptz, timestamptz, text[]);
CREATE FUNCTION public.elora_conversas_pares(_cliente_id text, _inicio timestamptz, _fim timestamptz, _excluir text[] DEFAULT '{}')
 RETURNS TABLE(sessao_id text, primeira_em timestamptz, usuario boolean, humano_em timestamptz, humano_user text, celular_em timestamptz)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH m AS (
    SELECT me.sessao_id::text AS sessao_id, me.enviada_em, me.externo_id::text AS externo_id,
           me.payload->>'origin' AS origem, me.user_id_elora::text AS user_id,
           ((me.enviada_em AT TIME ZONE 'UTC') - interval '3 hours')::date AS dia
    FROM public.elora_mensagens_espelho me
    WHERE me.cliente_id = _cliente_id AND me.direcao = 'TO_HUB'
      AND me.enviada_em >= _inicio AND me.enviada_em <= _fim
      AND (me.tipo IS NULL OR me.tipo NOT IN ('NOTE','TRANSITION','TRACK'))
  ), hum AS (
    SELECT * FROM m
    WHERE user_id IS NOT NULL AND user_id <> '' AND coalesce(origem,'') NOT IN ('BOT','CAMPAIGN','OFFICE_HOURS','API','PAYMENT')
      AND NOT (user_id = ANY(coalesce(_excluir, '{}')))
  ), h AS (
    SELECT DISTINCT ON (sessao_id, dia) sessao_id, dia, enviada_em, user_id
    FROM hum WHERE user_id <> '00000000-0000-0000-0000-000000000000'
    ORDER BY sessao_id, dia, enviada_em DESC, externo_id ASC
  ), c AS (
    SELECT sessao_id, dia, max(enviada_em) AS em FROM hum WHERE user_id = '00000000-0000-0000-0000-000000000000' GROUP BY sessao_id, dia
  )
  SELECT g.sessao_id, g.primeira_em, g.usuario, h.enviada_em, h.user_id, c.em
  FROM (SELECT sessao_id, dia, min(enviada_em) AS primeira_em, bool_or(origem = 'DEFAULT') AS usuario FROM m GROUP BY sessao_id, dia) g
  LEFT JOIN h ON h.sessao_id = g.sessao_id AND h.dia = g.dia
  LEFT JOIN c ON c.sessao_id = g.sessao_id AND c.dia = g.dia
$function$;
REVOKE ALL ON FUNCTION public.elora_conversas_pares(text, timestamptz, timestamptz, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.elora_conversas_pares(text, timestamptz, timestamptz, text[]) TO service_role;

DROP FUNCTION IF EXISTS public.elora_ultimo_humano_sessao(text, text[]);
CREATE FUNCTION public.elora_ultimo_humano_sessao(_cliente_id text, _excluir text[] DEFAULT '{}')
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
  ORDER BY me.sessao_id, (me.user_id_elora::text = '00000000-0000-0000-0000-000000000000'), me.enviada_em DESC, me.externo_id ASC
$function$;
REVOKE ALL ON FUNCTION public.elora_ultimo_humano_sessao(text, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.elora_ultimo_humano_sessao(text, text[]) TO service_role;