alter table public.photos
  add column if not exists empreinte text,
  add column if not exists nettete   real,
  add column if not exists ecarte    text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'photos_ecarte_valide'
  ) then
    alter table public.photos
      add constraint photos_ecarte_valide
      check (ecarte is null or ecarte in ('doublon', 'flou'));
  end if;
end $$;

create index if not exists photos_tri_idx
  on public.photos (event_id)
  where ecarte is null and empreinte is not null;

create or replace function public.distance_empreintes(a text, b text)
returns integer
language sql immutable strict
set search_path = public, pg_temp
as $$
  select length(
    replace((('x' || a)::bit(64) # ('x' || b)::bit(64))::text, '0', '')
  );
$$;

create or replace function public.trier_photo()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_doublon boolean;
begin
  if new.media_type is distinct from 'photo' then
    return new;
  end if;

  if new.nettete is not null and new.nettete < 55 then
    new.ecarte := 'flou';
    return new;
  end if;

  if new.empreinte is not null then
    select exists (
      select 1
      from public.photos p
      where p.event_id = new.event_id
        and p.empreinte is not null
        and p.ecarte is null
        and p.id is distinct from new.id
        and public.distance_empreintes(p.empreinte, new.empreinte) <= 6
    ) into v_doublon;

    if v_doublon then
      new.ecarte := 'doublon';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists photos_trier on public.photos;
create trigger photos_trier
  before insert on public.photos
  for each row execute function public.trier_photo();

create or replace function public.guest_list_media(
  p_event_id uuid, p_media text default 'all',
  p_limit integer default 24, p_offset integer default 0)
returns table (id uuid, url text, thumbnail_url text,
               file_name text, media_type text, uploaded_at timestamptz)
language sql stable security definer set search_path = public, pg_temp
as $$
  select p.id, p.url, p.thumbnail_url, p.file_name, p.media_type, p.uploaded_at
  from public.photos p
  where p.event_id = p_event_id
    and p.ecarte is null
    and (p_media = 'all' or p.media_type = p_media)
  order by p.uploaded_at desc
  limit least(greatest(coalesce(p_limit, 24), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.guest_count_media(
  p_event_id uuid, p_media text default 'all')
returns integer
language sql stable security definer set search_path = public, pg_temp
as $$
  select count(*)::integer from public.photos p
  where p.event_id = p_event_id
    and p.ecarte is null
    and (p_media = 'all' or p.media_type = p_media);
$$;

grant execute on function public.distance_empreintes(text, text) to authenticated;
grant execute on function public.guest_list_media(uuid, text, integer, integer) to anon, authenticated;
grant execute on function public.guest_count_media(uuid, text) to anon, authenticated;