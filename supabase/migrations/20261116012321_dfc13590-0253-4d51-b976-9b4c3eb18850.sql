REVOKE ALL ON public.elora_paineis_incorporados FROM anon, authenticated;
ALTER TABLE public.elora_paineis_incorporados ALTER COLUMN visao_id DROP NOT NULL;
ALTER TABLE public.elora_paineis_incorporados RENAME COLUMN dados_pessoais TO ocultar_pessoais;
CREATE UNIQUE INDEX elora_paineis_incorporados_ativo_todas
  ON public.elora_paineis_incorporados (cliente_id)
  WHERE revogado_em IS NULL AND visao_id IS NULL;
UPDATE public.elora_paineis_incorporados SET revogado_em = now(), ocultar_pessoais = false WHERE revogado_em IS NULL;