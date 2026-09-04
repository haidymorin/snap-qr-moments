create table if not exists public.clients (
  id                     uuid primary key default gen_random_uuid(),
  email                  text        not null,
  prenom                 text,
  nom                    text,
  telephone              text,
  marketing              boolean     not null default true,
  marketing_le           timestamptz,
  evenement_nom          text,
  evenement_date         date,
  evenement_type         text,
  formule_envisagee      text,
  a_achete               boolean     not null default false,
  premier_achat_le       timestamptz,
  origine                text        not null default 'parcours_achat',
  cree_le                timestamptz not null default now(),
  maj_le                 timestamptz not null default now()
);

grant select, update on public.clients to authenticated;
grant all on public.clients to service_role;

create unique index if not exists clients_email_unique
  on public.clients (lower(email));

create index if not exists clients_marketing_idx
  on public.clients (marketing) where marketing;

alter table public.clients enable row level security;

drop policy if exists "admin lit les clients" on public.clients;
create policy "admin lit les clients" on public.clients
  for select to authenticated using (public.est_admin());

drop policy if exists "admin corrige les clients" on public.clients;
create policy "admin corrige les clients" on public.clients
  for update to authenticated using (public.est_admin()) with check (public.est_admin());

create or replace function public.enregistrer_client(
  p_email     text,
  p_prenom    text default null,
  p_nom       text default null,
  p_telephone text default null,
  p_marketing boolean default null,
  p_ev_nom    text default null,
  p_ev_date   date default null,
  p_ev_type   text default null,
  p_formule   text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$' or length(v_email) > 254 then
    raise exception 'email_invalide';
  end if;

  insert into public.clients as c (
    email, prenom, nom, telephone, marketing, marketing_le,
    evenement_nom, evenement_date, evenement_type, formule_envisagee
  )
  values (
    v_email,
    nullif(btrim(coalesce(p_prenom, '')), ''),
    nullif(btrim(coalesce(p_nom, '')), ''),
    nullif(btrim(coalesce(p_telephone, '')), ''),
    coalesce(p_marketing, true),
    case when coalesce(p_marketing, true) then now() end,
    nullif(btrim(coalesce(p_ev_nom, '')), ''),
    p_ev_date,
    nullif(btrim(coalesce(p_ev_type, '')), ''),
    nullif(btrim(coalesce(p_formule, '')), '')
  )
  on conflict (lower(email)) do update set
    prenom            = coalesce(excluded.prenom, c.prenom),
    nom               = coalesce(excluded.nom, c.nom),
    telephone         = coalesce(excluded.telephone, c.telephone),
    marketing         = coalesce(p_marketing, c.marketing),
    marketing_le      = case
                          when coalesce(p_marketing, c.marketing) and not c.marketing
                            then now()
                          else c.marketing_le
                        end,
    evenement_nom     = coalesce(excluded.evenement_nom, c.evenement_nom),
    evenement_date    = coalesce(excluded.evenement_date, c.evenement_date),
    evenement_type    = coalesce(excluded.evenement_type, c.evenement_type),
    formule_envisagee = coalesce(excluded.formule_envisagee, c.formule_envisagee),
    maj_le            = now();
end;
$$;

grant execute on function public.enregistrer_client(
  text, text, text, text, boolean, text, date, text, text
) to anon, authenticated;

create or replace function public.desinscrire_client(p_email text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.clients
     set marketing = false, maj_le = now()
   where lower(email) = lower(btrim(coalesce(p_email, '')));
$$;

grant execute on function public.desinscrire_client(text) to anon, authenticated;