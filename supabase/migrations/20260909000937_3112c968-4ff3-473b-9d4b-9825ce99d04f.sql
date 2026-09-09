-- L'équipe d'administration, et les événements offerts

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

insert into public.user_roles (user_id, role)
select u.id, 'admin' from auth.users u
where lower(u.email) = public.email_fondatrice()
on conflict do nothing;

-- ── 2. Les invitations en attente

create table if not exists public.invitations (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  genre        text not null check (genre in ('admin', 'evenement')),
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

revoke all on function public.creer_evenement_offert(uuid, text, date, text, text, boolean, uuid) from public;

-- ── 6. Le rattrapage à l'inscription

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

revoke all on function public.appliquer_invitations() from public;

drop trigger if exists trg_appliquer_invitations on auth.users;
create trigger trg_appliquer_invitations
  after insert on auth.users
  for each row execute function public.appliquer_invitations();