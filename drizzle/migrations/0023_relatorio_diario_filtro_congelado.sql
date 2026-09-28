CREATE TABLE public.relatorio_diario_filtro_congelado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id text NOT NULL REFERENCES public.elora_clientes(id) ON DELETE CASCADE,
  usuario_alvo_id uuid NOT NULL,
  filtros jsonb NOT NULL DEFAULT '{}'::jsonb,
  congelado_por uuid,
  congelado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cliente_id, usuario_alvo_id)
);
GRANT SELECT ON public.relatorio_diario_filtro_congelado TO authenticated;
GRANT ALL ON public.relatorio_diario_filtro_congelado TO service_role;
ALTER TABLE public.relatorio_diario_filtro_congelado ENABLE ROW LEVEL SECURITY;
CREATE POLICY "filtro_congelado_select" ON public.relatorio_diario_filtro_congelado
  FOR SELECT TO authenticated
  USING (usuario_alvo_id = auth.uid() OR public.is_equipe_interna() OR public.parceiro_pode_ver_painel(cliente_id));