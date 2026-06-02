CREATE TABLE public.elora_financeiro (
  id text NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  descricao text NOT NULL,
  tipo text NOT NULL DEFAULT 'custo',
  categoria text,
  valor numeric NOT NULL DEFAULT 0,
  vencimento date,
  competencia text,
  status text NOT NULL DEFAULT 'pendente',
  nf_emitida boolean NOT NULL DEFAULT false,
  nf_numero text,
  observacao text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.elora_financeiro TO authenticated;
GRANT ALL ON public.elora_financeiro TO service_role;

ALTER TABLE public.elora_financeiro ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_select_elora_financeiro" ON public.elora_financeiro
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own_insert_elora_financeiro" ON public.elora_financeiro
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_update_elora_financeiro" ON public.elora_financeiro
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_delete_elora_financeiro" ON public.elora_financeiro
  FOR DELETE TO authenticated USING (user_id = auth.uid());