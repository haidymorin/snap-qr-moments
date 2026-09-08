-- ─────────────────────────────────────────────────────────────
-- L'équipe d'administration, et les événements offerts
--
-- Trois manques, réglés ensemble parce qu'ils partagent la même mécanique :
-- reconnaître quelqu'un à son adresse e-mail avant même qu'il ait un compte.
--
--   1. La fondatrice doit être administratrice dès qu'elle se connecte, sans
--      qu'on ait à toucher la base. Son adresse est écrite ici, une fois.
--   2. Elle doit pouvoir nommer et révoquer d'autres administrateurs. Nommer
--      quelqu'un qui n'a pas encore de compte doit marcher : le droit se pose
--      alors en attente et s'applique tout seul à l'inscription.
--   3. Elle doit pouvoir offrir un événement à un proche. Même problème, même
--      solution : l'événement attend son destinataire.
--
-- Le point délicat est le paiement des albums. Un événement offert n'est pas
-- forcément un album offert : on peut vouloir donner la galerie et laisser la
-- personne payer son album si elle en veut un. « albums_offerts » tranche, et
-- rien dans le parcours de commande ne doit deviner à la place.
--
-- Enfin, la fondatrice ne peut pas être révoquée, même par elle-même. Une
-- application sans administrateur est une application perdue.
-- ─────────────────────────────────────────────────────────────

-- ── 1. La fondatrice

create or replace function public.email_fondatrice()
returns text
language sql immutable
as $$ select 'haidymorin@gmail.com'::text $$;

create or replace function public.est_fondatrice(p_user uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from auth.users u
    where u.id = p_user and lower(u.email) = public.email_fondatrice()
  );
$$;

grant execute on function public.est_fondatrice(uuid) to authenticated;

-- Un administrateur, c'est un rôle posé OU la fondatrice. Ainsi elle garde la
-- main même si la ligne de rôle disparaît.
create or replace function public.est_admin(p_user uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = p_user and r.role = 'admin'
  ) or exists (
    select 1 from auth.users u
    where u.id = p_user and lower(u.email) = public.email_fondatrice()
  );
$$;

grant execute on function public.est_admin(uuid) to anon, authenticated;

-- Et on pose la ligne pour de bon si le compte existe déjà.
insert into public.user_roles (user_id, role)
select u.id, 'admin' from auth.users u
where lower(u.email) = public.email_fondatrice()
on conflict do nothing;

-- ── 2. Les invitations en attente

create table if not exists public.invitations (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  genre        text not null check (genre in ('admin', 'evenement')),
  -- Pour un événement offert : ce qu'il faut pour le créer à l'inscription.
  event_nom    text,
  event_date   date,
  event_type   text,
  plan         text,
  albums_offerts boolean not null default false,
  invite_par   uuid references auth.users(id) on delete set null,
  cree_le      timestamptz not null default now(),
  consomme_le  timestamptz
);

create unique index if not exists invitations_en_attente_idx
  on public.invitations (lower(email), genre) where consomme_le is null;

alter table public.invitations enable row level security;
grant all on public.invitations to service_role;

drop policy if exists "admin lit les invitations" on public.invitations;
create policy "admin lit les invitations" on public.invitations
  for select to authenticated using (public.est_admin());

-- ── 3. Ce qu'un événement doit savoir d'un cadeau

alter table public.events
  add column if not exists offert_par     uuid references auth.users(id) on delete set null,
  add column if not exists albums_offerts boolean not null default false;

comment on column public.events.albums_offerts is
  'Vrai : les albums de cet événement sont à la charge de QR Memories. Faux : le destinataire paie par Stripe comme n''importe quel client.';

-- ── 4. Nommer et révoquer des administrateurs

create or replace function public.admin_lister_equipe()
returns table (user_id uuid, email text, depuis timestamptz, fondatrice boolean, en_attente boolean)
language sql stable security definer set search_path = public, pg_temp
as $$
  select u.id, u.email, r.created_at,
         lower(u.email) = public.email_fondatrice(),
         false
  from public.user_roles r
  join auth.users u on u.id = r.user_id
  where r.role = 'admin' and public.est_admin()
  union all
  select null::uuid, i.email, i.cree_le, false, true
  from public.invitations i
  where i.genre = 'admin' and i.consomme_le is null and public.est_admin()
  order by 5, 3;
$$;

grant execute on function public.admin_lister_equipe() to authenticated;

create or replace function public.admin_ajouter_admin(p_email text)
returns text
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_id uuid; v_email text := lower(trim(p_email));
begin
  if not public.est_admin() then raise exception 'Réservé aux administrateurs'; end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Adresse e-mail invalide';
  end if;

  select id into v_id from auth.users where lower(email) = v_email;

  if v_id is not null then
    insert into public.user_roles (user_id, role) values (v_id, 'admin')
    on conflict do nothing;
    perform public.noter_action('admin_ajoute', null, jsonb_build_object('email', v_email));
    return 'ajoute';
  end if;

  insert into public.invitations (email, genre, invite_par)
  values (v_email, 'admin', auth.uid())
  on conflict do nothing;
  perform public.noter_action('admin_invite', null, jsonb_build_object('email', v_email));
  return 'invite';
end $$;

grant execute on function public.admin_ajouter_admin(text) to authenticated;

create or replace function public.admin_retirer_admin(p_email text)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_email text := lower(trim(p_email));
begin
  if not public.est_admin() then raise exception 'Réservé aux administrateurs'; end if;
  if v_email = public.email_fondatrice() then
    raise exception 'La fondatrice ne peut pas être retirée';
  end if;

  delete from public.user_roles r
  using auth.users u
  where u.id = r.user_id and lower(u.email) = v_email and r.role = 'admin';

  delete from public.invitations
  where lower(email) = v_email and genre = 'admin' and consomme_le is null;

  perform public.noter_action('admin_retire', null, jsonb_build_object('email', v_email));
end $$;

grant execute on function public.admin_retirer_admin(text) to authenticated;

-- ── 5. Offrir un événement

create or replace function public.admin_offrir_evenement(
  p_email  text,
  p_nom    text,
  p_date   date,
  p_type   text default 'mariage',
  p_plan   text default 'heritage',
  p_albums_offerts boolean default false
)
returns text
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_id uuid; v_email text := lower(trim(p_email)); v_event uuid;
begin
  if not public.est_admin() then raise exception 'Réservé aux administrateurs'; end if;
  if coalesce(trim(p_nom), '') = '' then raise exception 'Le nom de l''événement est obligatoire'; end if;
  if p_date is null then raise exception 'La date est obligatoire'; end if;

  select id into v_id from auth.users where lower(email) = v_email;

  if v_id is null then
    insert into public.invitations
      (email, genre, event_nom, event_date, event_type, plan, albums_offerts, invite_par)
    values (v_email, 'evenement', p_nom, p_date, p_type, p_plan, p_albums_offerts, auth.uid())
    on conflict do nothing;
    perform public.noter_action('evenement_offert_en_attente', null,
      jsonb_build_object('email', v_email, 'nom', p_nom));
    return 'invite';
  end if;

  v_event := public.creer_evenement_offert(v_id, p_nom, p_date, p_type, p_plan, p_albums_offerts, auth.uid());
  return v_event::text;
end $$;

grant execute on function public.admin_offrir_evenement(text, text, date, text, text, boolean) to authenticated;

-- La création elle-même, isolée : elle sert à la fois à l'appel direct et au
-- rattrapage à l'inscription.
create or replace function public.creer_evenement_offert(
  p_user uuid, p_nom text, p_date date, p_type text, p_plan text,
  p_albums_offerts boolean, p_par uuid
)
returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_event uuid; v_code text;
begin
  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.events where unique_code = v_code);
  end loop;

  insert into public.events
    (name, event_date, event_type, unique_code, user_id, plan,
     statut, paye_le, offert_par, albums_offerts)
  values
    (p_nom, p_date, coalesce(p_type, 'mariage'), v_code, p_user, coalesce(p_plan, 'heritage'),
     'actif', now(), p_par, coalesce(p_albums_offerts, false))
  returning id into v_event;

  perform public.noter_action('evenement_offert', v_event,
    jsonb_build_object('plan', p_plan, 'albums_offerts', p_albums_offerts));
  return v_event;
end $$;

-- Appelée uniquement depuis les deux fonctions ci-dessus, jamais depuis le
-- navigateur : sinon n'importe qui s'offrirait la formule Héritage.
revoke all on function public.creer_evenement_offert(uuid, text, date, text, text, boolean, uuid) from public;
revoke all on function public.appliquer_invitations() from public;

-- ── 6. Le rattrapage à l'inscription
--
-- Une invitation posée avant l'existence du compte s'applique au moment où la
-- personne s'inscrit. C'est ce déclencheur qui rend le point 2 et le point 3
-- utilisables sans demander à la personne de créer son compte d'abord.

create or replace function public.appliquer_invitations()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare inv record;
begin
  for inv in
    select * from public.invitations
    where lower(email) = lower(new.email) and consomme_le is null
  loop
    if inv.genre = 'admin' then
      insert into public.user_roles (user_id, role) values (new.id, 'admin')
      on conflict do nothing;
    else
      perform public.creer_evenement_offert(
        new.id, inv.event_nom, inv.event_date, inv.event_type,
        inv.plan, inv.albums_offerts, inv.invite_par);
    end if;
    update public.invitations set consomme_le = now() where id = inv.id;
  end loop;
  return new;
end $$;

drop trigger if exists trg_appliquer_invitations on auth.users;
create trigger trg_appliquer_invitations
  after insert on auth.users
  for each row execute function public.appliquer_invitations();
