CREATE INDEX IF NOT EXISTS elora_contatos_espelho_cliente_criado_idx ON public.elora_contatos_espelho (cliente_id, criado_em);
CREATE OR REPLACE FUNCTION public.elora_novos_contatos(_cliente_id text, _inicio timestamptz, _fim timestamptz)
RETURNS TABLE(externo_id text, criado_em timestamptz, origem text, utm_campaign text, sessao_id text, canal_id text, canal_nome text, atendente_id text, atendente_nome text, sessao_criado_em timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.externo_id, c.criado_em, c.origem, c.utm_campaign,
         s.externo_id, s.canal_id, s.canal_nome, s.atendente_id, s.atendente_nome, s.criado_em
  FROM public.elora_contatos_espelho c
  LEFT JOIN LATERAL (
    SELECT a.externo_id, a.canal_id, a.canal_nome, a.atendente_id, a.atendente_nome, a.criado_em
    FROM public.elora_atendimentos_espelho a
    WHERE a.cliente_id = _cliente_id AND a.contato_id = c.externo_id
    ORDER BY a.criado_em NULLS LAST, a.externo_id COLLATE "C"
    LIMIT 1
  ) s ON true
  WHERE c.cliente_id = _cliente_id AND c.criado_em >= _inicio AND c.criado_em <= _fim
$$;
REVOKE ALL ON FUNCTION public.elora_novos_contatos(text, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.elora_novos_contatos(text, timestamptz, timestamptz) TO service_role;