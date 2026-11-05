CREATE TABLE public.elora_relatorio_diario_backup (LIKE public.elora_relatorio_diario INCLUDING DEFAULTS);
ALTER TABLE public.elora_relatorio_diario_backup
  ADD COLUMN backup_em timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN backup_motivo text NOT NULL DEFAULT '';
GRANT ALL ON public.elora_relatorio_diario_backup TO service_role;
ALTER TABLE public.elora_relatorio_diario_backup ENABLE ROW LEVEL SECURITY;

INSERT INTO public.elora_relatorio_diario_backup
SELECT r.*, now(), 'n8n 25 e 26/09 antes da gravação do motor por canal/atendente/equipe'
FROM public.elora_relatorio_diario r
WHERE r.cliente_id = '8c0ojhr2' AND r.data IN ('2026-09-25','2026-09-26');

ALTER TABLE public.elora_integracao_contas ADD COLUMN IF NOT EXISTS fonte_dados text NOT NULL DEFAULT 'automatica';
ALTER TABLE public.elora_integracao_contas ADD CONSTRAINT integracao_fonte_dados_ck CHECK (fonte_dados IN ('automatica','antiga'));
UPDATE public.elora_integracao_contas SET fonte_dados = 'antiga' WHERE cliente_id = 'jvu3dzqk';

CREATE OR REPLACE FUNCTION public.substituir_relatorio_periodo(_cliente_id text, _de date, _ate date, _linhas jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  DELETE FROM public.elora_relatorio_diario WHERE cliente_id = _cliente_id AND data BETWEEN _de AND _ate;
  INSERT INTO public.elora_relatorio_diario (cliente_id, data, canal, atendente, equipe, novos_contatos, novos_contatos_ads,
    conversas_total_dia, conversas_usuario, conversas_bot, consulta_agendada, consulta_agendada_ads, procedimento_vendido,
    procedimento_vendido_ads, conversas_usuario_novos, conversas_origem_canal, estimado)
  SELECT _cliente_id, (l->>'dia')::date, coalesce(l->>'canal',''), coalesce(l->>'atendente',''), coalesce(l->>'equipe',''),
    (l->>'novos_contatos')::int, (l->>'novos_contatos_ads')::int, (l->>'conversas_total_dia')::int,
    (l->>'conversas_usuario')::int, (l->>'conversas_bot')::int, 0, 0, 0, 0, 0, 0, false
  FROM jsonb_array_elements(_linhas) l
  WHERE (l->>'dia')::date BETWEEN _de AND _ate;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.substituir_relatorio_periodo(text, date, date, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.substituir_relatorio_periodo(text, date, date, jsonb) TO service_role;