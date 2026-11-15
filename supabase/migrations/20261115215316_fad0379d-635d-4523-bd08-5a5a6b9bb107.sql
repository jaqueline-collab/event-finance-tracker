create or replace function public.elora_canais_atendimentos(_cliente_id text)
returns table(canal_id text, canal_nome text, atendimentos bigint)
language sql stable security definer set search_path = public as $$
  select a.canal_id, max(a.canal_nome), count(*) from public.elora_atendimentos_espelho a
  where a.cliente_id = _cliente_id and a.canal_id is not null group by a.canal_id
$$;
revoke all on function public.elora_canais_atendimentos(text) from public, anon, authenticated;
grant execute on function public.elora_canais_atendimentos(text) to service_role;