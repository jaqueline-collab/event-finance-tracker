update public.elora_dashboard_visoes v
set filtros = jsonb_set(v.filtros, '{cartoes}', (
  select jsonb_agg(case when e->>'id' = 'itens-agend' then e || jsonb_build_object('itensPorIndicador', jsonb_build_object(
    'consulta_agendada', jsonb_build_object('campoData', jsonb_build_object('fonte','card','campo','campo.data-da-consulta'), 'campoValor', jsonb_build_object('fonte','card','campo','campo.valor-da-consulta'), 'rotulo','Consultas'),
    'procedimento_vendido', jsonb_build_object('campoData', jsonb_build_object('fonte','card','campo','campo.data-do-procedimento'), 'campoValor', jsonb_build_object('fonte','card','campo','valor'), 'rotulo','Procedimentos')
  )) else e end order by ord)
  from jsonb_array_elements(v.filtros->'cartoes') with ordinality as t(e, ord)
))
where v.id = '2a1dc7bf-8543-473f-9bfc-d459959dce6f';