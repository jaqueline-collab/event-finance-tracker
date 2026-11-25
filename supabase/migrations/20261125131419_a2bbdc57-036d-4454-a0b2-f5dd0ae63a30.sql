ALTER TABLE public.elora_relatorio_corte_config
  ADD COLUMN IF NOT EXISTS origem_patrocinado jsonb;

ALTER TABLE public.elora_atendimentos_espelho
  ADD COLUMN IF NOT EXISTS classificado_em timestamp with time zone;

UPDATE public.elora_atendimentos_espelho
SET classificado_em = atualizado_em
WHERE classificacao IS NOT NULL
  AND classificado_em IS NULL;

CREATE INDEX IF NOT EXISTS elora_atendimentos_classificado_idx
  ON public.elora_atendimentos_espelho (cliente_id, classificado_em)
  WHERE classificado_em IS NOT NULL;

COMMENT ON COLUMN public.elora_relatorio_corte_config.origem_patrocinado IS 'Configuração por cliente: campo de origem e valores considerados patrocinados; demais valores e vazio são não patrocinados.';
COMMENT ON COLUMN public.elora_atendimentos_espelho.classificado_em IS 'Data informada pelo Elora para a classificação atual; preservada enquanto a classificação não mudar.';