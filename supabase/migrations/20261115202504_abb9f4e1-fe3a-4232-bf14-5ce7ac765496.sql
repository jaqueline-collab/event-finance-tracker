create table if not exists public.elora_sync_trava (cliente_id text primary key, ate timestamptz not null, dono text not null, iniciado_em timestamptz not null default now());
grant all on public.elora_sync_trava to service_role;
alter table public.elora_sync_trava enable row level security;
alter table public.elora_sync_estado add column if not exists ultimo_erro text, add column if not exists ultimo_erro_em timestamptz;
alter table public.elora_relatorio_corte_config add column if not exists cores_status jsonb not null default '{}'::jsonb;
create or replace function public.elora_pegar_trava(_cliente_id text, _dono text, _segundos int)
returns boolean language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  insert into elora_sync_trava(cliente_id, ate, dono, iniciado_em) values (_cliente_id, now() + make_interval(secs => _segundos), _dono, now())
  on conflict (cliente_id) do update set ate = excluded.ate, dono = excluded.dono, iniciado_em = now()
    where elora_sync_trava.ate < now() or elora_sync_trava.dono = _dono
  returning true into ok;
  return coalesce(ok, false);
end $$;
create or replace function public.elora_soltar_trava(_cliente_id text, _dono text)
returns void language sql security definer set search_path = public as $$
  delete from elora_sync_trava where cliente_id = _cliente_id and dono = _dono;
$$;
revoke all on function public.elora_pegar_trava(text,text,int) from public, anon, authenticated;
revoke all on function public.elora_soltar_trava(text,text) from public, anon, authenticated;
grant execute on function public.elora_pegar_trava(text,text,int) to service_role;
grant execute on function public.elora_soltar_trava(text,text) to service_role;