create table if not exists public.journal_admin (
  id         uuid primary key default gen_random_uuid(),
  fait_par   uuid references auth.users(id) on delete set null,
  action     text        not null,
  event_id   uuid,
  detail     jsonb       not null default '{}'::jsonb,
  fait_le    timestamptz not null default now()
);

create index if not exists journal_admin_date_idx on public.journal_admin (fait_le desc);

grant select on public.journal_admin to authenticated;
grant all on public.journal_admin to service_role;

alter table public.journal_admin enable row level security;

drop policy if exists "admin lit le journal" on public.journal_admin;
create policy "admin lit le journal" on public.journal_admin
  for select to authenticated using (public.est_admin());

create or replace function public.noter_action(
  p_action text, p_event uuid, p_detail jsonb default '{}'::jsonb)
returns void
language sql security definer set search_path = public, pg_temp
as $$
  insert into public.journal_admin (fait_par, action, event_id, detail)
  values (auth.uid(), p_action, p_event, coalesce(p_detail, '{}'::jsonb));
$$;

create or replace function public.admin_reporter(p_event uuid, p_date date)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_ancienne date;
  v_expire   date;
begin
  if not public.est_admin() then raise exception 'reserve_admin'; end if;
  if p_date is null then raise exception 'date_invalide'; end if;

  select event_date, expire_le into v_ancienne, v_expire
  from public.events where id = p_event;
  if not found then raise exception 'evenement_inconnu'; end if;

  update public.events
     set event_date = p_date,
         expire_le  = coalesce(v_expire, p_date + interval '6 months')::date
                      + (p_date - v_ancienne)
   where id = p_event;

  perform public.noter_action('report', p_event,
    jsonb_build_object('avant', v_ancienne, 'apres', p_date));
end;
$$;

create or replace function public.admin_changer_formule(
  p_event uuid, p_plan text, p_complement_centimes integer default 0)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_avant text;
begin
  if not public.est_admin() then raise exception 'reserve_admin'; end if;
  if p_plan not in ('essentiel', 'souvenir', 'heritage') then
    raise exception 'palier_inconnu';
  end if;

  select plan into v_avant from public.events where id = p_event;
  if not found then raise exception 'evenement_inconnu'; end if;

  update public.events set plan = p_plan where id = p_event;

  if coalesce(p_complement_centimes, 0) <> 0 then
    update public.paiements
       set montant_centimes = coalesce(montant_centimes, 0) + p_complement_centimes
     where event_id = p_event;
  end if;

  perform public.noter_action('formule', p_event,
    jsonb_build_object('avant', v_avant, 'apres', p_plan,
                       'complement_centimes', coalesce(p_complement_centimes, 0)));
end;
$$;

create or replace function public.admin_prolonger(p_event uuid, p_mois integer)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_expire date;
begin
  if not public.est_admin() then raise exception 'reserve_admin'; end if;
  if p_mois is null or p_mois < 1 or p_mois > 60 then raise exception 'duree_invalide'; end if;

  select expire_le into v_expire from public.events where id = p_event;
  if not found then raise exception 'evenement_inconnu'; end if;

  update public.events
     set expire_le = (greatest(coalesce(v_expire, current_date), current_date)
                      + (p_mois || ' months')::interval)::date,
         statut = case when statut = 'expire' then 'actif' else statut end,
         rappel_envoye_le = null
   where id = p_event;

  perform public.noter_action('prolongation', p_event,
    jsonb_build_object('mois', p_mois, 'avant', v_expire));
end;
$$;

create or replace function public.admin_retirer_media(p_photo uuid, p_motif text default null)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_event uuid;
begin
  if not public.est_admin() then raise exception 'reserve_admin'; end if;

  update public.photos set ecarte = 'retire' where id = p_photo returning event_id into v_event;
  if not found then raise exception 'media_inconnu'; end if;

  perform public.noter_action('retrait_media', v_event,
    jsonb_build_object('photo', p_photo, 'motif', p_motif));
end;
$$;

alter table public.photos drop constraint if exists photos_ecarte_valide;
alter table public.photos
  add constraint photos_ecarte_valide
  check (ecarte is null or ecarte in ('doublon', 'flou', 'retire'));

create or replace function public.admin_supprimer_evenement(p_event uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_nom text;
begin
  if not public.est_admin() then raise exception 'reserve_admin'; end if;

  select e.name into v_nom
  from public.events e
  where e.id = p_event
    and not exists (select 1 from public.paiements p where p.event_id = e.id);
  if not found then raise exception 'evenement_paye_ou_inconnu'; end if;

  perform public.noter_action('suppression', null,
    jsonb_build_object('event', p_event, 'nom', v_nom));

  delete from public.events where id = p_event;
end;
$$;

revoke execute on function
  public.admin_reporter(uuid, date),
  public.admin_changer_formule(uuid, text, integer),
  public.admin_prolonger(uuid, integer),
  public.admin_retirer_media(uuid, text),
  public.admin_supprimer_evenement(uuid),
  public.noter_action(text, uuid, jsonb)
from public, anon;

grant execute on function
  public.admin_reporter(uuid, date),
  public.admin_changer_formule(uuid, text, integer),
  public.admin_prolonger(uuid, integer),
  public.admin_retirer_media(uuid, text),
  public.admin_supprimer_evenement(uuid)
to authenticated;