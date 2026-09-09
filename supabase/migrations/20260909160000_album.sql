-- ─────────────────────────────────────────────────────────────
-- L'album, composé par les mariés
--
-- La promesse « nous mettons en page pour vous » supposait plusieurs heures de
-- travail manuel par client. Elle est remplacée par un outil : le site propose
-- une première sélection, les mariés en font ce qu'ils veulent.
--
-- Une page d'album n'est pas une photo. C'est l'un de cinq objets :
--
--   photo    une photo de la galerie, seule sur sa page
--   duo      deux photos côte à côte
--   pleine   une photo sur la double page
--   message  un mot du livre d'or, en vis-à-vis de la photo de son auteur
--   externe  une image apportée par les mariés — le photographe, un proche
--
-- « externe » est important : les mariés ont des photos qui ne sont jamais
-- passées par le QR code. Les refuser reviendrait à leur demander de faire
-- deux albums.
--
-- La position est un entier libre, sans contrainte d'unicité. Une contrainte
-- d'unicité rendrait tout réordonnancement impossible sans une danse de
-- valeurs temporaires ; on renumérote après coup, et un doublon de position
-- n'a aucune conséquence visible.
-- ─────────────────────────────────────────────────────────────

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

-- Les mariés composent leur album, et personne d'autre. Les quatre gestes sont
-- ouverts en écriture directe : contrairement aux actions d'administration, il
-- n'y a ici aucun privilège à obtenir — au pire on abîme son propre album.
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

-- ─────────────────────────────────────────────────────────────
-- La suggestion
--
-- Trois principes, et ils comptent plus que l'algorithme :
--
--   1. On raconte la journée, pas un palmarès. Les photos sont donc réparties
--      sur toute la durée de l'événement — ntile découpe la soirée en autant
--      de tranches que de pages, et chaque tranche donne une photo. Sans ça,
--      un album de soixante pages contient soixante photos de la piste de
--      danse, parce que c'est là qu'on photographie le plus.
--
--   2. Dans une tranche, on préfère d'abord les photos où figurent les mariés
--      — la liste leur est fournie par la recherche par visage, s'ils l'ont
--      lancée — puis les plus nettes.
--
--   3. Une rafale ne donne qu'une page. Le dédoublonnage se fait sur
--      l'empreinte perceptuelle déjà calculée au dépôt.
--
-- La graine sert au bouton « proposer autre chose » : elle départage les
-- ex æquo différemment, donc la sélection change sans que la logique bouge.
-- ─────────────────────────────────────────────────────────────

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

-- Poser la suggestion dans l'album. Remplace ce qui s'y trouve : c'est le sens
-- du bouton « proposer une autre sélection », et l'écran prévient avant.
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

-- Renumérotation après un déplacement : le navigateur envoie l'ordre voulu,
-- le serveur réécrit les positions de 1 à n. Plus sûr que de laisser le
-- navigateur calculer des positions intermédiaires.
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
