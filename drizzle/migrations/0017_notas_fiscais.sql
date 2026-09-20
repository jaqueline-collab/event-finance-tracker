CREATE TABLE public.elora_notas_fiscais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escopo text NOT NULL CHECK (escopo IN ('parceiro', 'cliente')),
  parceiro_id text REFERENCES public.elora_parceiros(id),
  cliente_id text REFERENCES public.elora_clientes(id),
  competencia text,
  valor_total numeric NOT NULL DEFAULT 0,
  drive_file_id text NOT NULL,
  drive_folder_id text NOT NULL,
  nome_arquivo text NOT NULL,
  mime_type text,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.elora_notas_fiscais TO authenticated;
GRANT ALL ON public.elora_notas_fiscais TO service_role;

ALTER TABLE public.elora_notas_fiscais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipe_gerencia_notas"
  ON public.elora_notas_fiscais FOR ALL TO authenticated
  USING (public.is_equipe_interna())
  WITH CHECK (public.is_equipe_interna());

CREATE POLICY "parceiro_ve_proprias_notas"
  ON public.elora_notas_fiscais FOR SELECT TO authenticated
  USING (escopo = 'parceiro' AND parceiro_id IS NOT NULL AND parceiro_id = public.parceiro_do_usuario());

CREATE TABLE public.elora_nota_fiscal_lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_id uuid NOT NULL REFERENCES public.elora_notas_fiscais(id) ON DELETE CASCADE,
  lancamento_id text NOT NULL REFERENCES public.elora_financeiro(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (nota_id, lancamento_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.elora_nota_fiscal_lancamentos TO authenticated;
GRANT ALL ON public.elora_nota_fiscal_lancamentos TO service_role;

ALTER TABLE public.elora_nota_fiscal_lancamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipe_gerencia_vinculos_notas"
  ON public.elora_nota_fiscal_lancamentos FOR ALL TO authenticated
  USING (public.is_equipe_interna())
  WITH CHECK (public.is_equipe_interna());

CREATE POLICY "parceiro_ve_vinculos_das_proprias_notas"
  ON public.elora_nota_fiscal_lancamentos FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.elora_notas_fiscais n
    WHERE n.id = nota_id
      AND n.escopo = 'parceiro'
      AND n.parceiro_id = public.parceiro_do_usuario()
  ));

CREATE INDEX idx_notas_fiscais_parceiro ON public.elora_notas_fiscais (parceiro_id);
CREATE INDEX idx_nota_lancamentos_lancamento ON public.elora_nota_fiscal_lancamentos (lancamento_id);