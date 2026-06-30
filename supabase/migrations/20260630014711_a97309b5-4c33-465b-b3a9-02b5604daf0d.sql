CREATE TABLE public.elora_descontos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id TEXT REFERENCES public.elora_clientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('valor','percentual','isencao_total')),
  escopo TEXT NOT NULL CHECK (escopo IN ('cliente','fechamento_inteiro')),
  valor NUMERIC,
  competencia_inicio TEXT NOT NULL,
  competencia_fim TEXT,
  recorrente BOOLEAN NOT NULL DEFAULT false,
  motivo TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT desconto_cliente_quando_escopo_cliente CHECK (
    (escopo = 'fechamento_inteiro' AND cliente_id IS NULL)
    OR (escopo = 'cliente' AND cliente_id IS NOT NULL)
  ),
  CONSTRAINT desconto_valor_obrigatorio CHECK (
    tipo = 'isencao_total' OR valor IS NOT NULL
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.elora_descontos TO authenticated;
GRANT ALL ON public.elora_descontos TO service_role;

ALTER TABLE public.elora_descontos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read descontos"
  ON public.elora_descontos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert descontos"
  ON public.elora_descontos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update descontos"
  ON public.elora_descontos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete descontos"
  ON public.elora_descontos FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_elora_descontos_cliente ON public.elora_descontos(cliente_id);
CREATE INDEX idx_elora_descontos_competencia ON public.elora_descontos(competencia_inicio, competencia_fim);

CREATE OR REPLACE FUNCTION public.touch_elora_descontos()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_elora_descontos_updated
  BEFORE UPDATE ON public.elora_descontos
  FOR EACH ROW EXECUTE FUNCTION public.touch_elora_descontos();