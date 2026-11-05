CREATE TABLE public.elora_suporte_interno (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text,
  email text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT suporte_interno_ident_ck CHECK (coalesce(nullif(trim(nome),''), nullif(trim(email),'')) IS NOT NULL)
);
GRANT ALL ON public.elora_suporte_interno TO service_role;
ALTER TABLE public.elora_suporte_interno ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.elora_relatorio_corte_config (
  cliente_id text PRIMARY KEY REFERENCES public.elora_clientes(id),
  equipe_por_canal jsonb NOT NULL DEFAULT '{}'::jsonb,
  atendentes_ignorados jsonb NOT NULL DEFAULT '[]'::jsonb,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.elora_relatorio_corte_config TO service_role;
ALTER TABLE public.elora_relatorio_corte_config ENABLE ROW LEVEL SECURITY;

INSERT INTO public.elora_suporte_interno (nome) VALUES ('Jaqueline Ditós');
INSERT INTO public.elora_relatorio_corte_config (cliente_id, equipe_por_canal) VALUES
('8c0ojhr2', '{"1aa98d0c-3ff9-4a2b-a792-9510e435feca":"Atendimento","4fa10e23-09dd-4750-9e07-b58fd8f0d569":"Social Seller","ad4ca0da-4933-47d1-a7e6-2b931d9800fe":"Social Seller","fb75ff26-dcf7-4b0f-b476-65c4d856a895":"Pós Operatório"}')
ON CONFLICT (cliente_id) DO NOTHING;