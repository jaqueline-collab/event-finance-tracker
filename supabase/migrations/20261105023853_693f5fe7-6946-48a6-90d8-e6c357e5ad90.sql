CREATE TABLE public.elora_cards_espelho (
  cliente_id text NOT NULL REFERENCES public.elora_clientes(id),
  externo_id text NOT NULL,
  painel_id text, painel_titulo text, etapa_id text, etapa_titulo text, etapa_fase text, status text,
  contato_ids text[] NOT NULL DEFAULT '{}',
  criado_em timestamptz, atualizado_em timestamptz,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  sincronizado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cliente_id, externo_id)
);
GRANT ALL ON public.elora_cards_espelho TO service_role;
ALTER TABLE public.elora_cards_espelho ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.elora_cards_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id text NOT NULL REFERENCES public.elora_clientes(id),
  card_id text NOT NULL,
  visto_em timestamptz NOT NULL,
  estimado boolean NOT NULL DEFAULT false,
  painel_id text, etapa_id text, etapa_titulo text, etapa_fase text, status text,
  campos jsonb NOT NULL DEFAULT '{}'::jsonb,
  hash text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX elora_cards_historico_card_idx ON public.elora_cards_historico (cliente_id, card_id, visto_em);
GRANT ALL ON public.elora_cards_historico TO service_role;
ALTER TABLE public.elora_cards_historico ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.elora_indicadores_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id text NOT NULL REFERENCES public.elora_clientes(id),
  chave text NOT NULL,
  nome text NOT NULL,
  fonte text NOT NULL DEFAULT 'cards',
  medida text NOT NULL DEFAULT 'contagem',
  evento jsonb NOT NULL DEFAULT '{}'::jsonb,
  condicoes jsonb NOT NULL DEFAULT '{"op":"E","itens":[]}'::jsonb,
  ordem integer NOT NULL DEFAULT 0,
  tipo text NOT NULL DEFAULT 'app',
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cliente_id, chave),
  CONSTRAINT indicadores_fonte_ck CHECK (fonte IN ('contatos','conversas','cards')),
  CONSTRAINT indicadores_medida_ck CHECK (medida IN ('contagem','soma','media')),
  CONSTRAINT indicadores_tipo_ck CHECK (tipo IN ('app','manual','combinada','formula'))
);
GRANT ALL ON public.elora_indicadores_config TO service_role;
ALTER TABLE public.elora_indicadores_config ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.elora_relatorio_diario ADD COLUMN IF NOT EXISTS estimado boolean NOT NULL DEFAULT false;

INSERT INTO public.elora_indicadores_config (cliente_id, chave, nome, fonte, medida, evento, condicoes, ordem, tipo) VALUES
('8c0ojhr2','consulta_agendada','Consulta Agendada','cards','contagem','{"tipo":"entrou_etapa","etapa":"Agendados"}','{"op":"E","itens":[{"campo":"contato.campo.data-da-consulta","operador":"preenchido"}]}',10,'app'),
('8c0ojhr2','consulta_agendada_ads','Consulta Agendada ADS','cards','contagem','{"tipo":"entrou_etapa","etapa":"Agendados"}','{"op":"E","itens":[{"campo":"contato.campo.data-da-consulta","operador":"preenchido"},{"campo":"contato.utm_campaign","operador":"preenchido"}]}',11,'app'),
('8c0ojhr2','procedimento_vendido','Procedimento Vendido','cards','contagem','{"tipo":"entrou_etapa","etapa":"Agendados"}','{"op":"E","itens":[{"campo":"contato.campo.data-procedimento","operador":"preenchido"}]}',20,'app'),
('8c0ojhr2','procedimento_vendido_ads','Procedimento Vendido ADS','cards','contagem','{"tipo":"entrou_etapa","etapa":"Agendados"}','{"op":"E","itens":[{"campo":"contato.campo.data-procedimento","operador":"preenchido"},{"campo":"contato.utm_campaign","operador":"preenchido"}]}',21,'app'),
('8c0ojhr2','social_selling','Social Selling','cards','contagem','{}','{"op":"E","itens":[]}',30,'manual')
ON CONFLICT (cliente_id, chave) DO NOTHING;