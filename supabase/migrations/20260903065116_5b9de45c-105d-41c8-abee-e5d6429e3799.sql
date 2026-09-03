-- Le livre d'or.
--
-- Un mot laissé par un invité, écrit ou enregistré à voix haute, avec une
-- photo s'il le souhaite. C'est la promesse manquante de la formule Souvenir,
-- vendue depuis le premier jour sans exister nulle part dans le code.
--
-- Trois choix de conception se lisent dans ce fichier :
--
--   1. Le prénom suffit. On ne demande ni compte, ni e-mail : ce serait cinq
--      gestes de plus au moment précis où quelqu'un a envie d'écrire.
--   2. Un message n'est jamais supprimé, il est masqué. Les mariés retirent ce
--      qui les gêne sans qu'on efface le souvenir de quelqu'un d'autre.
--   3. Qui peut lire les messages n'est pas notre décision. Certains couples
--      veulent un mur vivant pendant la fête, d'autres des mots qu'on n'écrit
--      que si personne ne regarde. Le réglage leur appartient.

-- ─────────────────────────────────────────────────────────────
-- 1. Les réglages, portés par l'événement
-- ─────────────────────────────────────────────────────────────

alter table public.events
  add column if not exists livre_dor_actif  boolean not null default true,
  add column if not exists livre_dor_public boolean not null default true,
  add column if not exists livre_dor_vocal  boolean not null default true;

comment on column public.events.livre_dor_public is
  'Vrai : les invités lisent les messages des autres. Faux : ils sont réservés aux hôtes.';

/* Le livre d'or fait partie du Souvenir, pas de l'Essentiel à 59 €. La règle
   est écrite ici, en un seul endroit, plutôt que répétée dans chaque
   politique — et surtout pas laissée au navigateur. */
create or replace function public.livre_dor_ouvert(p_event_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id
      and e.statut = 'actif'
      and (e.expire_le is null or e.expire_le >= current_date)
      and e.livre_dor_actif
      and e.plan in ('souvenir', 'heritage', 'admin')
  );
$$;

grant execute on function public.livre_dor_ouvert(uuid) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 2. Les messages
-- ─────────────────────────────────────────────────────────────

create table if not exists public.livre_dor (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events(id) on delete cascade,
  auteur          text not null,
  texte           text,
  audio_url       text,
  audio_secondes  integer,
  photo_url       text,
  photo_thumb_url text,
  masque          boolean not null default false,
  created_at      timestamptz not null default now(),

  -- Un message vide n'a aucun sens : il faut des mots, ou une voix.
  constraint livre_dor_non_vide check (
    coalesce(nullif(trim(texte), ''), audio_url) is not null
  ),
  constraint livre_dor_auteur_court check (char_length(trim(auteur)) between 1 and 60),
  constraint livre_dor_texte_court  check (texte is null or char_length(texte) <= 2000)
);

alter table public.livre_dor enable row level security;
grant all on public.livre_dor to service_role;
grant insert on public.livre_dor to anon, authenticated;
grant select, update on public.livre_dor to authenticated;

create index if not exists idx_livre_dor_event on public.livre_dor(event_id, created_at desc);

/* Écrire : ouvert à tous, sur un événement ouvert dont la formule inclut le
   livre d'or. C'est la même logique que le dépôt d'une photo — un invité n'a
   pas de compte, et ne doit pas en avoir. */
create policy "Un invite peut laisser un message"
  on public.livre_dor for insert to anon, authenticated
  with check (public.livre_dor_ouvert(event_id) and masque = false);

/* Lire depuis la table : réservé aux hôtes, qui voient tout, masqués compris.
   Les invités passent par la fonction plus bas, qui applique le réglage de
   visibilité. */
create policy "Les hotes lisent leur livre d'or"
  on public.livre_dor for select to authenticated
  using (
    exists (select 1 from public.events e
            where e.id = livre_dor.event_id and e.user_id = auth.uid())
    or public.est_admin()
  );

create policy "Les hotes masquent un message"
  on public.livre_dor for update to authenticated
  using (
    exists (select 1 from public.events e
            where e.id = livre_dor.event_id and e.user_id = auth.uid())
    or public.est_admin()
  );

-- ─────────────────────────────────────────────────────────────
-- 3. La lecture par les invités
-- ─────────────────────────────────────────────────────────────

/* Rien ne sort si le couple a choisi de garder les messages pour lui. Le
   réglage est appliqué ici, côté serveur : une case décochée dans le tableau
   de bord doit fermer la porte, pas seulement cacher un bouton. */
create or replace function public.guest_list_livre_dor(
  p_event_id uuid,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid, auteur text, texte text,
  audio_url text, audio_secondes integer,
  photo_url text, photo_thumb_url text,
  created_at timestamptz
)
language sql stable security definer set search_path = public, pg_temp
as $$
  select m.id, m.auteur, m.texte, m.audio_url, m.audio_secondes,
         m.photo_url, m.photo_thumb_url, m.created_at
  from public.livre_dor m
  join public.events e on e.id = m.event_id
  where m.event_id = p_event_id
    and m.masque = false
    and e.livre_dor_public
    and public.livre_dor_ouvert(p_event_id)
  order by m.created_at desc
  limit least(coalesce(p_limit, 50), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.guest_count_livre_dor(p_event_id uuid)
returns integer
language sql stable security definer set search_path = public, pg_temp
as $$
  select count(*)::int
  from public.livre_dor m
  join public.events e on e.id = m.event_id
  where m.event_id = p_event_id
    and m.masque = false
    and e.livre_dor_public
    and public.livre_dor_ouvert(p_event_id);
$$;

revoke execute on function public.guest_list_livre_dor(uuid, integer, integer) from public;
revoke execute on function public.guest_count_livre_dor(uuid) from public;
grant execute on function public.guest_list_livre_dor(uuid, integer, integer) to anon, authenticated;
grant execute on function public.guest_count_livre_dor(uuid) to anon, authenticated;

/* La page invité a besoin de savoir quoi proposer : le livre d'or est-il
   ouvert, les vocaux sont-ils autorisés, les messages des autres sont-ils
   lisibles. Trois booléens, rendus sans exposer la table des événements. */
create or replace function public.guest_reglages(p_event_id uuid)
returns table (livre_dor boolean, vocal boolean, messages_publics boolean)
language sql stable security definer set search_path = public, pg_temp
as $$
  select public.livre_dor_ouvert(p_event_id),
         e.livre_dor_vocal,
         e.livre_dor_public
  from public.events e
  where e.id = p_event_id;
$$;

grant execute on function public.guest_reglages(uuid) to anon, authenticated;