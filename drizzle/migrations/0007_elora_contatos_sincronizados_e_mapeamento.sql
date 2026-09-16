-- Contatos sincronizados do app Elora (leitura via RLS; gravação só pela função de sincronização via service role)
CREATE TABLE public.elora_contatos_sincronizados (
  id uuid primary key default gen_random_uuid(),
  cliente_id text not null references public.elora_clientes(id),
  contact_id text not null,
  nome text,
  telefone text,
  criado_em timestamptz,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  procedimento_interesse text,
  data_consulta text,
  sincronizado_em timestamptz not null default now(),
  unique (cliente_id, contact_id)
);

GRANT SELECT ON public.elora_contatos_sincronizados TO authenticated;
GRANT ALL ON public.elora_contatos_sincronizados TO service_role;

ALTER TABLE public.elora_contatos_sincronizados ENABLE ROW LEVEL SECURITY;

CREATE POLICY contatos_select_interno
  ON public.elora_contatos_sincronizados
  FOR SELECT TO authenticated
  USING (public.is_equipe_interna());

CREATE POLICY contatos_select_cliente
  ON public.elora_contatos_sincronizados
  FOR SELECT TO authenticated
  USING (cliente_id = public.cliente_do_usuario());

CREATE POLICY contatos_select_parceiro
  ON public.elora_contatos_sincronizados
  FOR SELECT TO authenticated
  USING (public.parceiro_pode_ver_painel(cliente_id));

-- Mapeamento dos campos personalizados + ponto de retomada da sincronização,
-- na mesma tabela restrita da chave de API (sem GRANT para logins comuns).
ALTER TABLE public.elora_integracao_contas ADD COLUMN campo_procedimento_key text;
ALTER TABLE public.elora_integracao_contas ADD COLUMN campo_data_consulta_key text;
ALTER TABLE public.elora_integracao_contas ADD COLUMN sync_janela_inicio timestamptz;
ALTER TABLE public.elora_integracao_contas ADD COLUMN sync_paginas_ok integer NOT NULL DEFAULT 0;