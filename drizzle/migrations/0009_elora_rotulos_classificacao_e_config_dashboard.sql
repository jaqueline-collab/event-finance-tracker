CREATE TABLE public.elora_classificacoes_descobertas (
  id uuid primary key default gen_random_uuid(),
  cliente_id text not null references public.elora_clientes(id),
  valor_bruto text not null,
  sincronizado_em timestamptz not null default now(),
  unique (cliente_id, valor_bruto)
);
GRANT SELECT ON public.elora_classificacoes_descobertas TO authenticated;
GRANT ALL ON public.elora_classificacoes_descobertas TO service_role;
ALTER TABLE public.elora_classificacoes_descobertas ENABLE ROW LEVEL SECURITY;
CREATE POLICY cls_desc_select_interno ON public.elora_classificacoes_descobertas FOR SELECT TO authenticated USING (public.is_equipe_interna());
CREATE POLICY cls_desc_select_cliente ON public.elora_classificacoes_descobertas FOR SELECT TO authenticated USING (cliente_id = public.cliente_do_usuario());
CREATE POLICY cls_desc_select_parceiro ON public.elora_classificacoes_descobertas FOR SELECT TO authenticated USING (public.parceiro_pode_ver_painel(cliente_id));

CREATE TABLE public.elora_classificacoes_rotulos (
  id uuid primary key default gen_random_uuid(),
  cliente_id text not null references public.elora_clientes(id),
  nome text not null,
  criado_em timestamptz not null default now(),
  unique (cliente_id, id)
);
GRANT SELECT ON public.elora_classificacoes_rotulos TO authenticated;
GRANT ALL ON public.elora_classificacoes_rotulos TO service_role;
ALTER TABLE public.elora_classificacoes_rotulos ENABLE ROW LEVEL SECURITY;
CREATE POLICY cls_rot_select_interno ON public.elora_classificacoes_rotulos FOR SELECT TO authenticated USING (public.is_equipe_interna());
CREATE POLICY cls_rot_select_cliente ON public.elora_classificacoes_rotulos FOR SELECT TO authenticated USING (cliente_id = public.cliente_do_usuario());
CREATE POLICY cls_rot_select_parceiro ON public.elora_classificacoes_rotulos FOR SELECT TO authenticated USING (public.parceiro_pode_ver_painel(cliente_id));

CREATE TABLE public.elora_classificacoes_rotulo_valores (
  rotulo_id uuid not null references public.elora_classificacoes_rotulos(id) on delete cascade,
  valor_bruto text not null,
  primary key (rotulo_id, valor_bruto)
);
GRANT SELECT ON public.elora_classificacoes_rotulo_valores TO authenticated;
GRANT ALL ON public.elora_classificacoes_rotulo_valores TO service_role;
ALTER TABLE public.elora_classificacoes_rotulo_valores ENABLE ROW LEVEL SECURITY;
CREATE POLICY cls_rv_select ON public.elora_classificacoes_rotulo_valores FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.elora_classificacoes_rotulos r WHERE r.id = rotulo_id));

ALTER TABLE public.elora_conversas_classificadas
  ADD COLUMN contato_id text,
  ADD COLUMN first_response_at timestamptz,
  ADD COLUMN time_wait_segundos integer,
  ADD COLUMN time_service_segundos integer;

ALTER TABLE public.elora_integracao_contas
  ADD COLUMN bloco2_rotulo_id uuid,
  ADD COLUMN bloco3_rotulo_id uuid,
  ADD COLUMN grafico1_serie1_rotulo_id uuid,
  ADD COLUMN grafico1_serie2_rotulo_id uuid,
  ADD COLUMN grafico2_serie1_rotulo_id uuid,
  ADD COLUMN grafico2_serie2_rotulo_id uuid,
  ADD CONSTRAINT fk_int_bloco2_rotulo FOREIGN KEY (cliente_id, bloco2_rotulo_id) REFERENCES public.elora_classificacoes_rotulos (cliente_id, id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_int_bloco3_rotulo FOREIGN KEY (cliente_id, bloco3_rotulo_id) REFERENCES public.elora_classificacoes_rotulos (cliente_id, id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_int_g1s1_rotulo FOREIGN KEY (cliente_id, grafico1_serie1_rotulo_id) REFERENCES public.elora_classificacoes_rotulos (cliente_id, id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_int_g1s2_rotulo FOREIGN KEY (cliente_id, grafico1_serie2_rotulo_id) REFERENCES public.elora_classificacoes_rotulos (cliente_id, id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_int_g2s1_rotulo FOREIGN KEY (cliente_id, grafico2_serie1_rotulo_id) REFERENCES public.elora_classificacoes_rotulos (cliente_id, id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_int_g2s2_rotulo FOREIGN KEY (cliente_id, grafico2_serie2_rotulo_id) REFERENCES public.elora_classificacoes_rotulos (cliente_id, id) ON DELETE SET NULL;