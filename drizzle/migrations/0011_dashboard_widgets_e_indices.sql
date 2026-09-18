-- 1) Campos personalizados dos contatos passam a ser um mapa aberto.
ALTER TABLE public.elora_contatos_sincronizados
  ADD COLUMN IF NOT EXISTS campos_personalizados jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Backfill: leva os dois campos antigos para dentro do mapa, usando a chave
-- técnica salva no mapeamento de cada cliente.
UPDATE public.elora_contatos_sincronizados c
SET campos_personalizados = coalesce(c.campos_personalizados, '{}'::jsonb)
  || case when i.campo_procedimento_key is not null and c.procedimento_interesse is not null
          then jsonb_build_object(i.campo_procedimento_key, c.procedimento_interesse)
          else '{}'::jsonb end
  || case when i.campo_data_consulta_key is not null and c.data_consulta is not null
          then jsonb_build_object(i.campo_data_consulta_key, c.data_consulta)
          else '{}'::jsonb end
FROM public.elora_integracao_contas i
WHERE i.cliente_id = c.cliente_id
  AND (c.procedimento_interesse IS NOT NULL OR c.data_consulta IS NOT NULL);

-- 2) Widgets do painel.
CREATE TABLE IF NOT EXISTS public.elora_dashboard_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id text NOT NULL REFERENCES public.elora_clientes(id),
  tipo text NOT NULL,
  titulo text NOT NULL,
  configuracao jsonb NOT NULL DEFAULT '{}'::jsonb,
  ordem integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.elora_dashboard_widgets TO authenticated;
GRANT ALL ON public.elora_dashboard_widgets TO service_role;

ALTER TABLE public.elora_dashboard_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY widgets_select_interno ON public.elora_dashboard_widgets
  FOR SELECT TO authenticated USING (public.is_equipe_interna());
CREATE POLICY widgets_select_cliente ON public.elora_dashboard_widgets
  FOR SELECT TO authenticated USING (cliente_id = public.cliente_do_usuario());
CREATE POLICY widgets_select_parceiro ON public.elora_dashboard_widgets
  FOR SELECT TO authenticated USING (public.parceiro_pode_ver_painel(cliente_id));

-- 3) Índices obrigatórios (cliente + data) nas tabelas sincronizadas.
CREATE INDEX IF NOT EXISTS idx_contatos_sinc_cliente_criado
  ON public.elora_contatos_sincronizados (cliente_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_conversas_cls_cliente_criado
  ON public.elora_conversas_classificadas (cliente_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_cls_descobertas_cliente_sinc
  ON public.elora_classificacoes_descobertas (cliente_id, sincronizado_em DESC);
CREATE INDEX IF NOT EXISTS idx_paineis_sinc_cliente_sinc
  ON public.elora_paineis_sincronizados (cliente_id, sincronizado_em DESC);
CREATE INDEX IF NOT EXISTS idx_sequencias_sinc_cliente_sinc
  ON public.elora_sequencias_sincronizadas (cliente_id, sincronizado_em DESC);
CREATE INDEX IF NOT EXISTS idx_widgets_cliente_ordem
  ON public.elora_dashboard_widgets (cliente_id, ordem);

-- 4) Migração das peças fixas de hoje para widgets equivalentes.
INSERT INTO public.elora_dashboard_widgets (cliente_id, tipo, titulo, configuracao, ordem)
SELECT i.cliente_id, 'metrico', 'Novos contatos',
       jsonb_build_object('fonte','contatos','criterio','total_contatos','secundario','anuncio',
                          'filtros', jsonb_build_object(
                            'usuarios', coalesce(i.filtro_usuarios,'[]'::jsonb),
                            'etiquetas', coalesce(i.filtro_etiquetas,'[]'::jsonb),
                            'campoPersonalizado', i.filtro_campo_personalizado,
                            'etapasFunil', coalesce(i.filtro_etapas_funil,'[]'::jsonb),
                            'campanha', to_jsonb(i.filtro_campanha))),
       0
FROM public.elora_integracao_contas i
WHERE NOT EXISTS (SELECT 1 FROM public.elora_dashboard_widgets w WHERE w.cliente_id = i.cliente_id)

UNION ALL
SELECT i.cliente_id, 'metrico', coalesce(r.nome,'Classificação'),
       jsonb_build_object('fonte','conversas','criterio','rotulo','rotuloId', r.id,
                          'secundario','anuncio','filtros','{}'::jsonb),
       1
FROM public.elora_integracao_contas i
JOIN public.elora_classificacoes_rotulos r ON r.id = i.bloco2_rotulo_id AND r.cliente_id = i.cliente_id
WHERE NOT EXISTS (SELECT 1 FROM public.elora_dashboard_widgets w WHERE w.cliente_id = i.cliente_id)

UNION ALL
SELECT i.cliente_id, 'metrico', coalesce(r.nome,'Classificação'),
       jsonb_build_object('fonte','conversas','criterio','rotulo','rotuloId', r.id,
                          'secundario','anuncio','filtros','{}'::jsonb),
       2
FROM public.elora_integracao_contas i
JOIN public.elora_classificacoes_rotulos r ON r.id = i.bloco3_rotulo_id AND r.cliente_id = i.cliente_id
WHERE NOT EXISTS (SELECT 1 FROM public.elora_dashboard_widgets w WHERE w.cliente_id = i.cliente_id)

UNION ALL
SELECT i.cliente_id, 'metrico', 'Conversas realizadas',
       jsonb_build_object('fonte','conversas','criterio','conversas_resposta','filtros','{}'::jsonb), 3
FROM public.elora_integracao_contas i
WHERE NOT EXISTS (SELECT 1 FROM public.elora_dashboard_widgets w WHERE w.cliente_id = i.cliente_id)

UNION ALL
SELECT i.cliente_id, 'metrico', 'Tempo até a primeira resposta',
       jsonb_build_object('fonte','conversas','criterio','tempo_espera','filtros','{}'::jsonb), 4
FROM public.elora_integracao_contas i
WHERE NOT EXISTS (SELECT 1 FROM public.elora_dashboard_widgets w WHERE w.cliente_id = i.cliente_id)

UNION ALL
SELECT i.cliente_id, 'metrico', 'Tempo de atendimento',
       jsonb_build_object('fonte','conversas','criterio','tempo_atendimento','filtros','{}'::jsonb), 5
FROM public.elora_integracao_contas i
WHERE NOT EXISTS (SELECT 1 FROM public.elora_dashboard_widgets w WHERE w.cliente_id = i.cliente_id)

UNION ALL
SELECT i.cliente_id, 'barras', 'Evolução mensal',
       jsonb_build_object('fonte','conversas','modo','lado','filtros','{}'::jsonb,
         'series', (SELECT coalesce(jsonb_agg(jsonb_build_object('rotuloId', x.id)), '[]'::jsonb)
                    FROM public.elora_classificacoes_rotulos x
                    WHERE x.cliente_id = i.cliente_id
                      AND x.id IN (i.grafico1_serie1_rotulo_id, i.grafico1_serie2_rotulo_id))), 6
FROM public.elora_integracao_contas i
WHERE (i.grafico1_serie1_rotulo_id IS NOT NULL OR i.grafico1_serie2_rotulo_id IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM public.elora_dashboard_widgets w WHERE w.cliente_id = i.cliente_id)

UNION ALL
SELECT i.cliente_id, 'barras', 'Evolução mensal (2)',
       jsonb_build_object('fonte','conversas','modo','lado','filtros','{}'::jsonb,
         'series', (SELECT coalesce(jsonb_agg(jsonb_build_object('rotuloId', x.id)), '[]'::jsonb)
                    FROM public.elora_classificacoes_rotulos x
                    WHERE x.cliente_id = i.cliente_id
                      AND x.id IN (i.grafico2_serie1_rotulo_id, i.grafico2_serie2_rotulo_id))), 7
FROM public.elora_integracao_contas i
WHERE (i.grafico2_serie1_rotulo_id IS NOT NULL OR i.grafico2_serie2_rotulo_id IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM public.elora_dashboard_widgets w WHERE w.cliente_id = i.cliente_id)

UNION ALL
SELECT i.cliente_id, 'ranking', 'Ranking de campanhas',
       jsonb_build_object('fonte','contatos','filtros','{}'::jsonb), 8
FROM public.elora_integracao_contas i
WHERE NOT EXISTS (SELECT 1 FROM public.elora_dashboard_widgets w WHERE w.cliente_id = i.cliente_id)

UNION ALL
SELECT i.cliente_id, 'tabela', 'Contatos',
       jsonb_build_object('fonte','contatos','filtros','{}'::jsonb), 9
FROM public.elora_integracao_contas i
WHERE NOT EXISTS (SELECT 1 FROM public.elora_dashboard_widgets w WHERE w.cliente_id = i.cliente_id);