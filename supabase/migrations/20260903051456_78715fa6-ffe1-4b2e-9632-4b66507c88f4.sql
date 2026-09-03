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

alter table public.events
  add column if not exists plan              text,
  add column if not exists statut            text,
  add column if not exists paye_le           timestamptz,
  add column if not exists expire_le         date,
  add column if not exists stripe_session_id text;

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

drop policy if exists "Authenticated users can create events" on public.events;

create policy "Seule l'administratrice cree un evenement a la main"
  on public.events for insert to authenticated
  with check (auth.uid() = user_id and public.est_admin());

drop policy if exists "Events are viewable by anyone" on public.events;

create policy "Un hote voit ses evenements, l'administratrice les voit tous"
  on public.events for select to authenticated
  using (auth.uid() = user_id or public.est_admin());

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

alter table public.paiements
  add column if not exists acces_delivre_le timestamptz;