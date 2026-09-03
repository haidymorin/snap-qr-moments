-- Relier l'argent au produit.
--
-- Jusqu'ici les deux vivaient séparément : Stripe encaissait, et le site créait
-- des événements gratuits pour quiconque avait un compte. Celui qui payait ne
-- recevait rien d'automatique, celui qui ne payait pas avait tout. Cette
-- migration ferme le circuit.
--
-- Trois idées la structurent :
--   1. Un événement porte désormais ce qu'il a coûté et jusqu'à quand il vit.
--   2. Un événement ne naît plus dans le navigateur : il naît du paiement,
--      créé côté serveur par le webhook Stripe. Seule l'administratrice garde
--      le droit d'en créer à la main.
--   3. Un événement non payé n'existe pas pour les invités.

-- ─────────────────────────────────────────────────────────────
-- 1. Le rôle administrateur
--
-- Dans une table à part, et non dans `profiles` : le propriétaire d'un profil
-- a le droit de le modifier, il pourrait donc se nommer administrateur
-- lui-même. Ici, aucune politique n'est déclarée — la table est invisible et
-- inaccessible depuis le navigateur, quelle que soit la session.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.user_roles (
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('admin')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

alter table public.user_roles enable row level security;
grant all on public.user_roles to service_role;

create or replace function public.est_admin(p_user uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = p_user and r.role = 'admin'
  );
$$;

grant execute on function public.est_admin(uuid) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 2. Ce qu'un événement sait de lui-même
-- ─────────────────────────────────────────────────────────────

alter table public.events
  add column if not exists plan              text,
  add column if not exists statut            text,
  add column if not exists paye_le           timestamptz,
  add column if not exists expire_le         date,
  add column if not exists stripe_session_id text;

-- Les événements déjà en base sont antérieurs au paiement : on les active,
-- au palier le plus complet, plutôt que de casser ce qui fonctionne.
update public.events
   set plan      = coalesce(plan, 'heritage'),
       statut    = coalesce(statut, 'actif'),
       expire_le = coalesce(expire_le, (created_at + interval '6 months')::date)
 where plan is null or statut is null or expire_le is null;

alter table public.events
  alter column plan   set default 'essentiel',
  alter column statut set default 'brouillon';

alter table public.events
  alter column plan   set not null,
  alter column statut set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'events_plan_valide') then
    alter table public.events add constraint events_plan_valide
      check (plan in ('essentiel', 'souvenir', 'heritage', 'admin'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'events_statut_valide') then
    alter table public.events add constraint events_statut_valide
      check (statut in ('brouillon', 'actif', 'expire'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'events_session_unique') then
    alter table public.events add constraint events_session_unique
      unique (stripe_session_id);
  end if;
end $$;

create index if not exists idx_events_session on public.events(stripe_session_id);
create index if not exists idx_events_echeance on public.events(expire_le) where statut = 'actif';

-- ─────────────────────────────────────────────────────────────
-- 3. Un seul test, écrit une fois : cet événement est-il ouvert ?
-- ─────────────────────────────────────────────────────────────

create or replace function public.evenement_actif(p_event_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id
      and e.statut = 'actif'
      and (e.expire_le is null or e.expire_le >= current_date)
  );
$$;

grant execute on function public.evenement_actif(uuid) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 4. Qui peut créer un événement
--
-- Plus personne depuis le navigateur, sauf l'administratrice. Le webhook
-- Stripe écrit avec la clé de service, qui ne passe pas par ces politiques.
-- ─────────────────────────────────────────────────────────────

drop policy if exists "Authenticated users can create events" on public.events;

create policy "Seule l'administratrice cree un evenement a la main"
  on public.events for insert to authenticated
  with check (auth.uid() = user_id and public.est_admin());

-- La lecture de la table était ouverte à tous. Les invités n'en ont pas besoin :
-- ils passent par guest_get_event, qui ne rend qu'un événement à la fois et
-- seulement s'il est actif.
drop policy if exists "Events are viewable by anyone" on public.events;

create policy "Un hote voit ses evenements, l'administratrice les voit tous"
  on public.events for select to authenticated
  using (auth.uid() = user_id or public.est_admin());

-- ─────────────────────────────────────────────────────────────
-- 5. Un événement non payé n'existe pas pour les invités
-- ─────────────────────────────────────────────────────────────

drop policy if exists "Anyone can upload photos" on public.photos;
drop policy if exists "Guests can upload to an existing event" on public.photos;

create policy "Depot autorise seulement sur un evenement ouvert"
  on public.photos for insert to anon, authenticated
  with check (public.evenement_actif(event_id));

create or replace function public.guest_get_event(p_event_id uuid)
returns table (id uuid, name text, event_date date, event_type text)
language sql stable security definer set search_path = public, pg_temp
as $$
  select e.id, e.name, e.event_date, e.event_type
  from public.events e
  where e.id = p_event_id
    and e.statut = 'actif'
    and (e.expire_le is null or e.expire_le >= current_date);
$$;

-- ─────────────────────────────────────────────────────────────
-- 6. La trace des paiements
--
-- Les événements Stripe arrivent parfois deux fois : la clé primaire est
-- l'identifiant Stripe, donc rejouer un webhook ne crée pas un doublon. C'est
-- aussi ce qui rendra la comptabilité possible sans ressaisie.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.paiements (
  stripe_session_id text primary key,
  event_id          uuid references public.events(id) on delete set null,
  email             text,
  plan              text,
  montant_centimes  integer,
  devise            text not null default 'eur',
  statut            text not null default 'paye',
  recu_le           timestamptz not null default now(),
  charge_utile      jsonb
);

alter table public.paiements enable row level security;
grant all on public.paiements to service_role;

create policy "L'administratrice lit les paiements"
  on public.paiements for select to authenticated
  using (public.est_admin());

create index if not exists idx_paiements_date on public.paiements(recu_le desc);

-- L'accès livré une seule fois : la page de confirmation échange
-- l'identifiant de session Stripe contre un lien de connexion, dans les trente
-- minutes qui suivent le paiement, et une seule fois. Passé ce délai, on
-- repasse par la page de connexion ordinaire.
alter table public.paiements
  add column if not exists acces_delivre_le timestamptz;
