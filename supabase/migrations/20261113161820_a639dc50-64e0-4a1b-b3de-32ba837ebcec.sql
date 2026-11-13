drop policy if exists "medalhas leitura" on public.elora_medalhas;
create policy "medalhas leitura" on public.elora_medalhas for select to authenticated
using (public.is_equipe_interna() or public.cliente_do_usuario() is not null or public.parceiro_do_usuario() is not null);
drop policy if exists "niveis leitura" on public.elora_niveis_gamificacao;
create policy "niveis leitura" on public.elora_niveis_gamificacao for select to authenticated
using (public.is_equipe_interna() or public.cliente_do_usuario() is not null or public.parceiro_do_usuario() is not null);