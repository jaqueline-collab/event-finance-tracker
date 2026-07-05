
-- Fechamentos persistentes (múltiplos por competência)
CREATE TABLE public.elora_fechamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia text NOT NULL, -- YYYY-MM
  titulo text NOT NULL,
  descricao text,
  status text NOT NULL DEFAULT 'emitido', -- 'rascunho' | 'emitido' | 'cancelado'
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  total_bruto numeric(14,2) NOT NULL DEFAULT 0,
  total_desconto numeric(14,2) NOT NULL DEFAULT 0,
  total_liquido numeric(14,2) NOT NULL DEFAULT 0,
  observacao text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.elora_fechamentos TO authenticated;
GRANT ALL ON public.elora_fechamentos TO service_role;

ALTER TABLE public.elora_fechamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read fechamentos" ON public.elora_fechamentos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert fechamentos" ON public.elora_fechamentos
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update fechamentos" ON public.elora_fechamentos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin delete fechamentos" ON public.elora_fechamentos
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE INDEX elora_fechamentos_competencia_idx ON public.elora_fechamentos(competencia);

CREATE TRIGGER trg_elora_fechamentos_touch
  BEFORE UPDATE ON public.elora_fechamentos
  FOR EACH ROW EXECUTE FUNCTION public.touch_elora_descontos();

-- Itens (contas) do fechamento
CREATE TABLE public.elora_fechamento_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fechamento_id uuid NOT NULL REFERENCES public.elora_fechamentos(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL,
  plano_id uuid,
  ciclo_inicio date,
  ciclo_fim date,
  vencimento date,
  valor_bruto numeric(14,2) NOT NULL DEFAULT 0,
  valor_desconto numeric(14,2) NOT NULL DEFAULT 0,
  valor_liquido numeric(14,2) NOT NULL DEFAULT 0,
  lancamento_financeiro_id uuid,
  payload_snapshot jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.elora_fechamento_itens TO authenticated;
GRANT ALL ON public.elora_fechamento_itens TO service_role;

ALTER TABLE public.elora_fechamento_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read fech itens" ON public.elora_fechamento_itens
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert fech itens" ON public.elora_fechamento_itens
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update fech itens" ON public.elora_fechamento_itens
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin delete fech itens" ON public.elora_fechamento_itens
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE INDEX elora_fechamento_itens_fech_idx ON public.elora_fechamento_itens(fechamento_id);
CREATE INDEX elora_fechamento_itens_cliente_idx ON public.elora_fechamento_itens(cliente_id);
