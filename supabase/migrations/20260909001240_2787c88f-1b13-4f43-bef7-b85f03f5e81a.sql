create table if not exists public.album_pages (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events(id) on delete cascade,
  position      integer not null default 0,
  genre         text not null check (genre in ('photo', 'duo', 'pleine', 'message', 'externe')),
  photo_id      uuid references public.photos(id)    on delete cascade,
  photo2_id     uuid references public.photos(id)    on delete cascade,
  message_id    uuid references public.livre_dor(id) on delete cascade,
  externe_url   text,
  externe_thumb text,
  legende       text,
  cree_le       timestamptz not null default now()
);

create index if not exists album_pages_event_idx on public.album_pages (event_id, position);

alter table public.album_pages enable row level security;
grant all on public.album_pages to service_role;

drop policy if exists "les mariés lisent leur album" on public.album_pages;
create policy "les mariés lisent leur album" on public.album_pages
  for select to authenticated
  using (exists (select 1 from public.events e
                 where e.id = event_id and (e.user_id = auth.uid() or public.est_admin())));

drop policy if exists "les mariés composent leur album" on public.album_pages;
create policy "les mariés composent leur album" on public.album_pages
  for all to authenticated
  using (exists (select 1 from public.events e
                 where e.id = event_id and (e.user_id = auth.uid() or public.est_admin())))
  with check (exists (select 1 from public.events e
                      where e.id = event_id and (e.user_id = auth.uid() or public.est_admin())));

create or replace function public.album_suggerer(
  p_event        uuid,
  p_cible        integer default 60,
  p_graine       integer default 0,
  p_prioritaires uuid[]  default '{}'::uuid[]
)
returns table (photo_id uuid, rang integer)
language sql stable security definer set search_path = public, pg_temp
as $$
  with autorise as (
    select 1 from public.events e
    where e.id = p_event and (e.user_id = auth.uid() or public.est_admin())
  ),
  base as (
    select p.id, p.uploaded_at, coalesce(p.nettete, 0) as nettete,
           (p.id = any(coalesce(p_prioritaires, '{}'::uuid[]))) as prioritaire,
           row_number() over (
             partition by coalesce(p.empreinte, p.id::text)
             order by coalesce(p.nettete, 0) desc
           ) as rang_doublon
    from public.photos p
    where exists (select 1 from autorise)
      and p.event_id = p_event
      and p.media_type = 'photo'
      and p.ecarte is null
  ),
  tranches as (
    select b.*, ntile(greatest(p_cible, 1)) over (order by b.uploaded_at) as tranche
    from base b
    where b.rang_doublon = 1
  ),
  choix as (
    select t.id, t.uploaded_at,
           row_number() over (
             partition by t.tranche
             order by t.prioritaire desc, t.nettete desc,
                      md5(t.id::text || p_graine::text)
           ) as r
    from tranches t
  )
  select c.id, (row_number() over (order by c.uploaded_at))::integer
  from choix c
  where c.r = 1;
$$;

grant execute on function public.album_suggerer(uuid, integer, integer, uuid[]) to authenticated;

create or replace function public.album_composer(
  p_event        uuid,
  p_cible        integer default 60,
  p_graine       integer default 0,
  p_prioritaires uuid[]  default '{}'::uuid[]
)
returns integer
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_n integer;
begin
  if not exists (select 1 from public.events e
                 where e.id = p_event and (e.user_id = auth.uid() or public.est_admin())) then
    raise exception 'Cet album ne vous appartient pas';
  end if;

  delete from public.album_pages where event_id = p_event;

  insert into public.album_pages (event_id, position, genre, photo_id)
  select p_event, s.rang, 'photo', s.photo_id
  from public.album_suggerer(p_event, p_cible, p_graine, p_prioritaires) s;

  get diagnostics v_n = row_count;
  return v_n;
end $$;

grant execute on function public.album_composer(uuid, integer, integer, uuid[]) to authenticated;

create or replace function public.album_reordonner(p_event uuid, p_ordre uuid[])
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not exists (select 1 from public.events e
                 where e.id = p_event and (e.user_id = auth.uid() or public.est_admin())) then
    raise exception 'Cet album ne vous appartient pas';
  end if;

  update public.album_pages a
  set position = o.rang
  from (select unnest(p_ordre) as id, generate_subscripts(p_ordre, 1) as rang) o
  where a.id = o.id and a.event_id = p_event;
end $$;

grant execute on function public.album_reordonner(uuid, uuid[]) to authenticated;