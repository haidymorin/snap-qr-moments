-- ─────────────────────────────────────────────────────────────
-- Le tri des doublons et des photos floues
--
-- Il était vendu sur les trois formules et décrit dans les conditions de
-- vente — « nettoyage automatique des doublons et des photos floues » — sans
-- exister nulle part dans le code. Le voici.
--
-- Deux nombres arrivent du navigateur de l'invité, calculés sur son téléphone
-- au moment du dépôt (voir src/lib/triPhotos.ts) : une empreinte perceptuelle
-- et une mesure de netteté. Aucun serveur ne recalcule quoi que ce soit, et
-- aucune image n'est retéléchargée.
--
-- Rien n'est jamais supprimé. Une photo écartée reste en base, reste
-- téléchargeable, et les mariés peuvent la réafficher d'un bouton. Une photo
-- floue peut être la seule où figure la grand-mère : l'effacer serait une
-- erreur qu'aucun remboursement ne rattrape.
-- ─────────────────────────────────────────────────────────────

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

-- Les photos déjà en base n'ont pas d'empreinte : elles restent toutes
-- affichées. On ne réécrit pas le passé.

create index if not exists photos_tri_idx
  on public.photos (event_id)
  where ecarte is null and empreinte is not null;

-- ─────────────────────────────────────────────────────────────
-- Distance entre deux empreintes
--
-- Le nombre de bits qui diffèrent. Deux photos d'une même rafale sont à 2 ou
-- 3 ; deux photos sans rapport dépassent 20. On écrit la comparaison sans
-- bit_count() pour ne dépendre d'aucune version de PostgreSQL en particulier.
-- ─────────────────────────────────────────────────────────────

create or replace function public.distance_empreintes(a text, b text)
returns integer
language sql immutable strict
set search_path = public, pg_temp
as $$
  select length(
    replace((('x' || a)::bit(64) # ('x' || b)::bit(64))::text, '0', '')
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- Le tri, au moment du dépôt
--
-- Seuils prudents, et volontairement asymétriques : écarter une bonne photo
-- coûte bien plus cher que de laisser passer une mauvaise. Dans le premier
-- cas, la personne ne retrouve pas son souvenir et n'a aucun moyen de le
-- savoir.
-- ─────────────────────────────────────────────────────────────

create or replace function public.trier_photo()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_doublon boolean;
begin
  -- Les vidéos ne sont jamais triées : on ne juge pas la netteté d'une vidéo
  -- sur sa vignette, et deux vidéos ne sont jamais des doublons l'une de
  -- l'autre au sens où on l'entend ici.
  if new.media_type is distinct from 'photo' then
    return new;
  end if;

  -- Le flou d'abord. Une netteté nulle signifie « image trop sombre ou trop
  -- plate pour être jugée » : dans ce cas on ne juge pas.
  if new.nettete is not null and new.nettete < 55 then
    new.ecarte := 'flou';
    return new;
  end if;

  -- Puis le doublon, comparé aux seules photos conservées : sur une rafale de
  -- cinq, la première reste et les quatre suivantes sont écartées.
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

-- ─────────────────────────────────────────────────────────────
-- Ce que voient les invités
--
-- La galerie commune masque les écartées : c'est la promesse vendue.
-- `guest_list_by_ids` n'est PAS modifiée, volontairement — l'onglet « Mes
-- envois » doit continuer à montrer à chacun ce qu'il a envoyé, sans quoi il
-- croirait son dépôt perdu et écrirait pour le signaler.
-- ─────────────────────────────────────────────────────────────

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
