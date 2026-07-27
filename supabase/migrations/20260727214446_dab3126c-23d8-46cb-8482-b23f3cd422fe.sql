CREATE TABLE public.elora_custos_wts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_key text NOT NULL,
  descricao text NOT NULL,
  faixa_min numeric NOT NULL DEFAULT 0,
  faixa_max numeric,
  preco_unit numeric NOT NULL DEFAULT 0,
  unidade text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX elora_custos_wts_item_faixa_idx
  ON public.elora_custos_wts (item_key, faixa_min);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.elora_custos_wts TO authenticated;
GRANT ALL ON public.elora_custos_wts TO service_role;

ALTER TABLE public.elora_custos_wts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custos_wts_select_authenticated"
  ON public.elora_custos_wts FOR SELECT TO authenticated USING (true);

CREATE POLICY "custos_wts_insert_admin"
  ON public.elora_custos_wts FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "custos_wts_update_admin"
  ON public.elora_custos_wts FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "custos_wts_delete_admin"
  ON public.elora_custos_wts FOR DELETE TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.touch_elora_custos_wts()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_touch_elora_custos_wts
  BEFORE UPDATE ON public.elora_custos_wts
  FOR EACH ROW EXECUTE FUNCTION public.touch_elora_custos_wts();

INSERT INTO public.elora_custos_wts (item_key, descricao, faixa_min, faixa_max, preco_unit, unidade) VALUES
  ('licenca_base', 'Licença base Helena', 0, NULL, 149.90, 'mês'),
  ('canal_whats_exc', 'Canal WhatsApp excedente (1º ao 4º)', 1, 4, 29.90, 'canal'),
  ('canal_whats_exc', 'Canal WhatsApp excedente (5º em diante)', 5, NULL, 19.90, 'canal'),
  ('canal_insta_exc', 'Canal Instagram excedente (1º ao 4º)', 1, 4, 29.90, 'canal'),
  ('canal_insta_exc', 'Canal Instagram excedente (5º em diante)', 5, NULL, 19.90, 'canal'),
  ('canal_messenger_exc', 'Canal Messenger excedente (1º ao 4º)', 1, 4, 29.90, 'canal'),
  ('canal_messenger_exc', 'Canal Messenger excedente (5º em diante)', 5, NULL, 19.90, 'canal'),
  ('usuario_exc', 'Usuário excedente (1º ao 17º)', 1, 17, 19.90, 'usuário'),
  ('usuario_exc', 'Usuário excedente (18º ao 97º)', 18, 97, 14.90, 'usuário'),
  ('usuario_exc', 'Usuário excedente (98º em diante)', 98, NULL, 12.90, 'usuário'),
  ('contato_exc', 'Contato ativo (5.000 a 20.000)', 5000, 20000, 0.045, 'contato'),
  ('contato_exc', 'Contato ativo (20.000 a 100.000)', 20000, 100000, 0.035, 'contato'),
  ('contato_exc', 'Contato ativo (100.000+)', 100000, NULL, 0.025, 'contato'),
  ('ia', 'Módulo Agentes de IA', 0, NULL, 50.00, 'mês'),
  ('asaas', 'Módulo ASAAS', 0, NULL, 49.50, 'mês'),
  ('zapi', 'Canal Z-API', 0, NULL, 69.00, 'canal'),
  ('transcricao_user', 'Transcrição de áudio por usuário', 0, NULL, 3.99, 'usuário/mês'),
  ('desconto_escala', 'Desconto de escala WTS 10% (R$10k a R$25k)', 10000, 25000, 0.10, 'percentual'),
  ('desconto_escala', 'Desconto de escala WTS 15% (R$25k a R$50k)', 25000, 50000, 0.15, 'percentual'),
  ('desconto_escala', 'Desconto de escala WTS 20% (R$50k a R$100k)', 50000, 100000, 0.20, 'percentual'),
  ('desconto_escala', 'Desconto de escala WTS 25% (R$100k+)', 100000, NULL, 0.25, 'percentual');