alter table public.events
  add column if not exists diaporama_jeton  uuid not null default gen_random_uuid(),
  add column if not exists diaporama_delai_min integer not null default 0,
  add column if not exists diaporama_mode text not null default 'photos';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'events_diaporama_mode_valide') then
    alter table public.events add constraint events_diaporama_mode_valide
      check (diaporama_mode in ('photos', 'livre_dor', 'alterne'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'events_diaporama_delai_valide') then
    alter table public.events add constraint events_diaporama_delai_valide
      check (diaporama_delai_min between 0 and 5);
  end if;
end $$;

alter table public.photos
  add column if not exists hors_diaporama boolean not null default false;

create or replace function public.regenerer_jeton_diaporama(p_event uuid)
returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_nouveau uuid;
begin
  update public.events set diaporama_jeton = gen_random_uuid()
   where id = p_event and (user_id = auth.uid() or public.est_admin())
  returning diaporama_jeton into v_nouveau;
  if not found then raise exception 'acces_refuse'; end if;
  return v_nouveau;
end;
$$;

grant execute on function public.regenerer_jeton_diaporama(uuid) to authenticated;

create or replace function public.diaporama_flux(
  p_event uuid, p_jeton uuid, p_limite integer default 80)
returns table (
  genre text, id uuid, url text, apercu text, media_type text,
  auteur text, texte text, cree_le timestamptz
)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  v_mode  text;
  v_delai integer;
  v_avant timestamptz;
begin
  select e.diaporama_mode, e.diaporama_delai_min
    into v_mode, v_delai
  from public.events e
  where e.id = p_event
    and e.diaporama_jeton = p_jeton
    and e.statut = 'actif'
    and e.plan in ('souvenir', 'heritage');

  if not found then raise exception 'acces_refuse'; end if;

  v_avant := now() - (coalesce(v_delai, 0) || ' minutes')::interval;

  return query
  select * from (
    select 'photo'::text, p.id, p.url, coalesce(p.thumbnail_url, p.url), p.media_type,
           null::text, null::text, p.uploaded_at
    from public.photos p
    where p.event_id = p_event
      and p.ecarte is null
      and p.hors_diaporama = false
      and p.media_type = 'photo'
      and p.uploaded_at <= v_avant
      and v_mode in ('photos', 'alterne')

    union all

    select 'message'::text, m.id, m.photo_url, m.photo_thumb_url, null::text,
           m.auteur, m.texte, m.created_at
    from public.livre_dor m
    where m.event_id = p_event
      and m.masque = false
      and nullif(trim(m.texte), '') is not null
      and m.created_at <= v_avant
      and v_mode in ('livre_dor', 'alterne')
  ) tout
  order by 8 desc
  limit least(greatest(coalesce(p_limite, 80), 1), 200);
end;
$$;

grant execute on function public.diaporama_flux(uuid, uuid, integer) to anon, authenticated;

create or replace function public.regler_diaporama(
  p_event uuid, p_mode text, p_delai integer)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if p_mode not in ('photos', 'livre_dor', 'alterne') then raise exception 'mode_inconnu'; end if;
  if p_delai < 0 or p_delai > 5 then raise exception 'delai_invalide'; end if;

  update public.events
     set diaporama_mode = p_mode, diaporama_delai_min = p_delai
   where id = p_event and (user_id = auth.uid() or public.est_admin());
  if not found then raise exception 'acces_refuse'; end if;
end;
$$;

grant execute on function public.regler_diaporama(uuid, text, integer) to authenticated;