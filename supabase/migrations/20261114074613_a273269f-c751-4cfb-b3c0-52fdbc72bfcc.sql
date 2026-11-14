CREATE INDEX IF NOT EXISTS elora_mensagens_espelho_cliente_dir_enviada_idx ON public.elora_mensagens_espelho (cliente_id, direcao, enviada_em);
CREATE INDEX IF NOT EXISTS elora_atendimentos_espelho_cliente_contato_idx ON public.elora_atendimentos_espelho (cliente_id, contato_id);
CREATE INDEX IF NOT EXISTS elora_cards_historico_cliente_id_idx ON public.elora_cards_historico (cliente_id, id);
CREATE INDEX IF NOT EXISTS elora_conversas_classificadas_cliente_id_idx ON public.elora_conversas_classificadas (cliente_id, id);

-- Conversas por sessão + dia (Brasília, UTC-3), sem trazer mensagens nem texto.
CREATE OR REPLACE FUNCTION public.elora_conversas_pares(_cliente_id text, _inicio timestamptz, _fim timestamptz)
RETURNS TABLE (sessao_id text, primeira_em timestamptz, usuario boolean, humano_em timestamptz, humano_user text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
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
    ORDER BY sessao_id, dia, enviada_em DESC, externo_id ASC
  )
  SELECT g.sessao_id, g.primeira_em, g.usuario, h.enviada_em, h.user_id
  FROM (SELECT sessao_id, dia, min(enviada_em) AS primeira_em, bool_or(origem = 'DEFAULT') AS usuario FROM m GROUP BY sessao_id, dia) g
  LEFT JOIN h ON h.sessao_id = g.sessao_id AND h.dia = g.dia
$$;
REVOKE ALL ON FUNCTION public.elora_conversas_pares(text, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.elora_conversas_pares(text, timestamptz, timestamptz) TO service_role;

-- Versões para o cache: sincronização e configuração do cliente.
CREATE OR REPLACE FUNCTION public.elora_versoes_cache(_cliente_id text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'sync', (SELECT coalesce(max(greatest(coalesce(concluido_em, 'epoch'), coalesce(atualizado_em, 'epoch')))::text, '') FROM public.elora_sync_estado WHERE cliente_id = _cliente_id),
    'config', md5(
      coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text)::text FROM public.elora_relatorio_corte_config x WHERE x.cliente_id = _cliente_id), '') ||
      coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text)::text FROM public.elora_indicadores_config x WHERE x.cliente_id = _cliente_id), '') ||
      coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text)::text FROM public.elora_campos_ajustes x WHERE x.cliente_id = _cliente_id), '') ||
      coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text)::text FROM public.elora_matriz_manual x WHERE x.cliente_id = _cliente_id), '') ||
      coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text)::text FROM public.elora_dados_canais_permitidos x WHERE x.cliente_id = _cliente_id), '') ||
      coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text)::text FROM public.elora_integracao_contas x WHERE x.cliente_id = _cliente_id), '') ||
      coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text)::text FROM public.elora_suporte_interno x), '')
    )
  )
$$;
REVOKE ALL ON FUNCTION public.elora_versoes_cache(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.elora_versoes_cache(text) TO service_role;

CREATE TABLE public.elora_calculo_cache (
  chave text PRIMARY KEY,
  cliente_id text NOT NULL,
  valor jsonb NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.elora_calculo_cache TO service_role;
ALTER TABLE public.elora_calculo_cache ENABLE ROW LEVEL SECURITY;
CREATE INDEX elora_calculo_cache_cliente_idx ON public.elora_calculo_cache (cliente_id, criado_em);