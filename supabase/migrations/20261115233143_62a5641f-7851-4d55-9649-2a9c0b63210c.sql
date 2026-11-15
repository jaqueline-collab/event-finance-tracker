ALTER TABLE public.elora_suporte_interno ADD COLUMN IF NOT EXISTS telefone text;
UPDATE public.elora_suporte_interno SET email = 'jaqueline@eloracrm.com.br', telefone = '21995501331' WHERE lower(trim(nome)) = 'jaqueline ditós';
INSERT INTO public.elora_suporte_interno (nome, email, telefone)
SELECT 'Jaqueline Ditós', 'jaqueline@eloracrm.com.br', '21995501331'
WHERE NOT EXISTS (SELECT 1 FROM public.elora_suporte_interno WHERE lower(trim(nome)) = 'jaqueline ditós');

DROP FUNCTION IF EXISTS public.elora_conversas_pares(text, timestamptz, timestamptz);
CREATE FUNCTION public.elora_conversas_pares(_cliente_id text, _inicio timestamptz, _fim timestamptz, _excluir text[] DEFAULT '{}')
 RETURNS TABLE(sessao_id text, primeira_em timestamptz, usuario boolean, humano_em timestamptz, humano_user text)
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
  ), h AS (
    SELECT DISTINCT ON (sessao_id, dia) sessao_id, dia, enviada_em, user_id
    FROM m
    WHERE user_id IS NOT NULL AND user_id <> '' AND coalesce(origem,'') NOT IN ('BOT','CAMPAIGN','OFFICE_HOURS','API','PAYMENT')
      AND NOT (user_id = ANY(coalesce(_excluir, '{}')))
    ORDER BY sessao_id, dia, enviada_em DESC, externo_id ASC
  )
  SELECT g.sessao_id, g.primeira_em, g.usuario, h.enviada_em, h.user_id
  FROM (SELECT sessao_id, dia, min(enviada_em) AS primeira_em, bool_or(origem = 'DEFAULT') AS usuario FROM m GROUP BY sessao_id, dia) g
  LEFT JOIN h ON h.sessao_id = g.sessao_id AND h.dia = g.dia
$function$;
REVOKE ALL ON FUNCTION public.elora_conversas_pares(text, timestamptz, timestamptz, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.elora_conversas_pares(text, timestamptz, timestamptz, text[]) TO service_role;