-- ─────────────────────────────────────────────────────────────
-- Le jeu photo
--
-- Ce n'est pas un gadget : c'est le seul levier qui fasse passer une soirée de
-- deux cents photos à neuf cents. Un invité qui a « une liste » photographie
-- des choses qu'il n'aurait jamais pensé à photographier — la table des
-- grands-parents, le traiteur, la mariée de dos qui rit. Ce sont précisément
-- les photos qui manquent au photographe.
--
-- Formule Souvenir et au-dessus, comme le diaporama et le livre d'or : ce sont
-- les trois choses qui se passent PENDANT la soirée.
--
-- Un seul moteur, trois modèles. Un défi, une photo, un point. Le reste — la
-- grille de bingo, l'objectif chiffré, le classement par table — n'est qu'une
-- manière différente de compter les mêmes points. Construire trois jeux
-- séparés aurait triplé le code pour la même mécanique.
--
-- Ce qu'on ne fait pas, et c'est un choix : ni vote, ni note, ni commentaire.
-- Une soirée n'a pas besoin d'un réseau social, et un classement de popularité
-- finit toujours par blesser quelqu'un à la table du fond.
-- ─────────────────────────────────────────────────────────────

alter table public.events
  add column if not exists jeu_actif   boolean not null default false,
  add column if not exists jeu_modele  text    not null default 'chasse',
  add column if not exists jeu_lot     text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'events_jeu_modele_valide') then
    alter table public.events add constraint events_jeu_modele_valide
      check (jeu_modele in ('chasse', 'bingo', 'objectif'));
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- Les défis
-- ─────────────────────────────────────────────────────────────

create table if not exists public.defis (
  id       uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  ordre    integer not null default 0,
  texte    text not null,
  constraint defis_texte_court check (char_length(trim(texte)) between 3 and 140)
);

create index if not exists defis_event_idx on public.defis (event_id, ordre);

alter table public.defis enable row level security;

drop policy if exists "les hotes gerent leurs defis" on public.defis;
create policy "les hotes gerent leurs defis" on public.defis
  for all to authenticated
  using (exists (select 1 from public.events e where e.id = event_id and e.user_id = auth.uid()))
  with check (exists (select 1 from public.events e where e.id = event_id and e.user_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- Les défis relevés
--
-- L'invité n'a pas de compte : il est identifié par une clé tirée au hasard
-- sur son téléphone, la même qui sert déjà à retrouver ses envois. Elle ne dit
-- rien de lui, ne le suit pas d'un événement à l'autre, et disparaît avec le
-- navigateur.
--
-- Un défi relevé une seule fois par personne : sans cette contrainte, envoyer
-- dix fois la même photo suffirait à gagner, et le jeu ne durerait pas
-- vingt minutes.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.defis_releves (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  defi_id    uuid not null references public.defis(id) on delete cascade,
  photo_id   uuid references public.photos(id) on delete set null,
  invite_cle text not null,
  prenom     text,
  cree_le    timestamptz not null default now(),
  constraint defis_releves_unique unique (defi_id, invite_cle),
  constraint defis_releves_cle_valide check (char_length(invite_cle) between 8 and 64),
  constraint defis_releves_prenom_court check (prenom is null or char_length(trim(prenom)) <= 40)
);

create index if not exists defis_releves_event_idx on public.defis_releves (event_id);

alter table public.defis_releves enable row level security;

drop policy if exists "les hotes lisent les releves" on public.defis_releves;
create policy "les hotes lisent les releves" on public.defis_releves
  for select to authenticated
  using (exists (select 1 from public.events e where e.id = event_id and e.user_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- Ce que voit l'invité
-- ─────────────────────────────────────────────────────────────

create or replace function public.guest_jeu(p_event uuid, p_invite text)
returns table (
  actif boolean, modele text, lot text,
  defi_id uuid, ordre integer, texte text, releve boolean, releves_total bigint
)
language sql stable security definer set search_path = public, pg_temp
as $$
  select e.jeu_actif, e.jeu_modele, e.jeu_lot,
         d.id, d.ordre, d.texte,
         exists (select 1 from public.defis_releves r
                  where r.defi_id = d.id and r.invite_cle = p_invite),
         (select count(*) from public.defis_releves r2 where r2.defi_id = d.id)
  from public.events e
  join public.defis d on d.event_id = e.id
  where e.id = p_event
    and e.jeu_actif
    and e.statut = 'actif'
    and e.plan in ('souvenir', 'heritage')
  order by d.ordre, d.texte;
$$;

grant execute on function public.guest_jeu(uuid, text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Relever un défi
--
-- La photo doit appartenir à l'événement : sans cette vérification, on
-- pourrait rattacher n'importe quel identifiant et marquer des points sans
-- jamais rien photographier.
-- ─────────────────────────────────────────────────────────────

create or replace function public.relever_defi(
  p_event uuid, p_defi uuid, p_photo uuid, p_invite text, p_prenom text default null)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if char_length(coalesce(p_invite, '')) not between 8 and 64 then
    raise exception 'invite_invalide';
  end if;

  if not exists (
    select 1 from public.events e
     where e.id = p_event and e.jeu_actif and e.statut = 'actif'
       and e.plan in ('souvenir', 'heritage')
  ) then raise exception 'jeu_ferme'; end if;

  if not exists (select 1 from public.defis d where d.id = p_defi and d.event_id = p_event) then
    raise exception 'defi_inconnu';
  end if;

  if p_photo is not null and not exists (
    select 1 from public.photos ph where ph.id = p_photo and ph.event_id = p_event
  ) then raise exception 'photo_inconnue'; end if;

  insert into public.defis_releves (event_id, defi_id, photo_id, invite_cle, prenom)
  values (p_event, p_defi, p_photo, p_invite, nullif(btrim(coalesce(p_prenom, '')), ''))
  on conflict (defi_id, invite_cle) do nothing;
end;
$$;

grant execute on function public.relever_defi(uuid, uuid, uuid, text, text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Le classement
--
-- Rendu sans la clé d'invité : le tableau projeté sur le mur ne doit contenir
-- que des prénoms. Ceux qui n'en ont pas donné apparaissent sous « Un invité »
-- plutôt que d'être exclus — quelqu'un qui a relevé huit défis mérite sa
-- ligne, même anonyme.
-- ─────────────────────────────────────────────────────────────

create or replace function public.jeu_classement(p_event uuid, p_limite integer default 10)
returns table (prenom text, points bigint)
language sql stable security definer set search_path = public, pg_temp
as $$
  select coalesce(nullif(btrim(max(r.prenom)), ''), 'Un invité'), count(*)
  from public.defis_releves r
  where r.event_id = p_event
  group by r.invite_cle
  order by 2 desc, 1
  limit least(greatest(coalesce(p_limite, 10), 1), 50);
$$;

grant execute on function public.jeu_classement(uuid, integer) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Côté hôtes : allumer le jeu et poser ses défis
--
-- Les défis sont remplacés en bloc plutôt que modifiés un par un. C'est
-- volontairement brutal : tant que la soirée n'a pas commencé, il n'y a rien à
-- préserver, et une fois qu'elle a commencé on ne change pas les règles en
-- cours de route. Les relevés déjà enregistrés tombent avec leurs défis — d'où
-- le refus si quelqu'un a déjà joué.
-- ─────────────────────────────────────────────────────────────

create or replace function public.regler_jeu(
  p_event uuid, p_actif boolean, p_modele text, p_lot text, p_defis text[])
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare i integer;
begin
  if p_modele not in ('chasse', 'bingo', 'objectif') then raise exception 'modele_inconnu'; end if;

  update public.events
     set jeu_actif = coalesce(p_actif, false),
         jeu_modele = p_modele,
         jeu_lot = nullif(btrim(coalesce(p_lot, '')), '')
   where id = p_event
     and (user_id = auth.uid() or public.est_admin())
     and plan in ('souvenir', 'heritage');
  if not found then raise exception 'acces_refuse'; end if;

  if p_defis is null then return; end if;

  if exists (select 1 from public.defis_releves r where r.event_id = p_event) then
    raise exception 'jeu_deja_commence';
  end if;

  delete from public.defis where event_id = p_event;

  i := 0;
  for i in 1 .. least(array_length(p_defis, 1), 24) loop
    if char_length(btrim(p_defis[i])) >= 3 then
      insert into public.defis (event_id, ordre, texte)
      values (p_event, i, left(btrim(p_defis[i]), 140));
    end if;
  end loop;
end;
$$;

grant execute on function public.regler_jeu(uuid, boolean, text, text, text[]) to authenticated;

create or replace function public.hote_defis(p_event uuid)
returns table (id uuid, ordre integer, texte text, releves bigint)
language sql stable security definer set search_path = public, pg_temp
as $$
  select d.id, d.ordre, d.texte,
         (select count(*) from public.defis_releves r where r.defi_id = d.id)
  from public.defis d
  join public.events e on e.id = d.event_id
  where d.event_id = p_event and (e.user_id = auth.uid() or public.est_admin())
  order by d.ordre;
$$;

grant execute on function public.hote_defis(uuid) to authenticated;
