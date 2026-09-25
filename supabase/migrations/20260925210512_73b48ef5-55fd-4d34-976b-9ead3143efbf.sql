alter table public.events
  add column if not exists merci_texte      text,
  add column if not exists merci_envoi_le   timestamptz,
  add column if not exists merci_envoye_le  timestamptz;

create index if not exists events_merci_a_envoyer_idx
  on public.events (merci_envoi_le)
  where merci_envoi_le is not null and merci_envoye_le is null;

create or replace function public.guest_laisser_email(p_event_id uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  propre text := lower(nullif(trim(p_email), ''));
begin
  if propre is null then return; end if;
  if propre !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then
    raise exception 'adresse invalide';
  end if;
  if not exists (select 1 from public.events e where e.id = p_event_id) then
    raise exception 'unknown event';
  end if;

  insert into public.guest_contacts (event_id, email, source, uploaded)
  values (p_event_id, propre, 'galerie', true)
  on conflict do nothing;
end;
$$;

revoke execute on function public.guest_laisser_email(uuid, text) from public;
grant execute on function public.guest_laisser_email(uuid, text) to anon, authenticated;

create or replace function public.merci_destinataires(p_event_id uuid)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::int
  from public.guest_contacts g
  join public.events e on e.id = g.event_id
  where g.event_id = p_event_id
    and g.email is not null
    and (e.user_id = auth.uid() or public.est_admin());
$$;

revoke execute on function public.merci_destinataires(uuid) from public;
grant execute on function public.merci_destinataires(uuid) to authenticated;

do $$
declare
  a_le_coffre boolean;
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    raise notice 'pg_cron indisponible : le mot de merci devra être planifié autrement.';
    return;
  end if;

  create extension if not exists pg_cron;
  create extension if not exists pg_net;

  select exists (
    select 1 from vault.decrypted_secrets where name = 'service_role_key'
  ) into a_le_coffre;

  if not a_le_coffre then
    raise notice 'Secret service_role_key absent du coffre : tâche non planifiée.';
    return;
  end if;

  if exists (select 1 from cron.job where jobname = 'mot-de-merci') then
    perform cron.unschedule('mot-de-merci');
  end if;

  perform cron.schedule(
    'mot-de-merci',
    '5 * * * *',
    $tache$
    select net.http_post(
      url := 'https://suewfrgrddcuqphwegtn.supabase.co/functions/v1/mot-de-merci',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'
        )
      ),
      body := '{}'::jsonb
    );
    $tache$
  );
exception
  when insufficient_privilege then
    raise notice 'Droits insuffisants pour planifier : à faire depuis le tableau de bord.';
end $$;