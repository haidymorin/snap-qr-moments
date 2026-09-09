-- L'annonce aux invités

alter table public.events
  add column if not exists annonce_texte  text,
  add column if not exists annonce_depuis timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'events_annonce_longueur') then
    alter table public.events
      add constraint events_annonce_longueur
      check (annonce_texte is null or char_length(annonce_texte) <= 180);
  end if;
end $$;

create or replace function public.guest_annonce(p_event_id uuid)
returns table (texte text, depuis timestamptz)
language sql stable security definer set search_path = public, pg_temp
as $$
  select e.annonce_texte, e.annonce_depuis
  from public.events e
  where e.id = p_event_id
    and e.statut = 'actif'
    and (e.expire_le is null or e.expire_le >= current_date)
    and e.annonce_texte is not null;
$$;

revoke all on function public.guest_annonce(uuid) from public;
grant execute on function public.guest_annonce(uuid) to anon, authenticated;

comment on function public.guest_annonce(uuid) is
  'Le message affiché en haut de la page des invités. Lecture publique, volontairement limitée à deux colonnes.';