-- ─────────────────────────────────────────────────────────────
-- Le mot de remerciement, programmé pour le lendemain soir
--
-- C'est une mécanique de récupération, pas une politesse. Le soir du
-- mariage, les invités ont déposé ce qu'ils avaient sous la main. Le
-- lendemain vers 20 h, sur leur canapé, ils trient enfin leurs photos de la
-- veille — c'est le seul moment où leur galerie leur revient en tête, et
-- personne ne pense à les relancer à cet instant précis.
--
-- Les mariés, eux, sont en voyage de noces ou en train de dormir. Donc le
-- message s'écrit avant, se programme, et part tout seul.
--
-- Trois colonnes seulement : le texte, l'heure d'envoi, et la date d'envoi
-- effectif. Cette dernière garantit qu'un message ne part qu'une fois, même
-- si la tâche tourne toutes les heures.
--
-- Les destinataires sont les invités qui ont VOLONTAIREMENT laissé leur
-- adresse dans la galerie, pour recevoir le lien. Personne d'autre. On
-- n'invente pas une liste de diffusion à partir d'un mariage.
-- ─────────────────────────────────────────────────────────────

alter table public.events
  add column if not exists merci_texte      text,
  add column if not exists merci_envoi_le   timestamptz,
  add column if not exists merci_envoye_le  timestamptz;

-- L'index ne porte que sur ce que la tâche cherche : un envoi dû, pas encore
-- fait. Sans la clause partielle, elle relirait toute la table chaque heure.
create index if not exists events_merci_a_envoyer_idx
  on public.events (merci_envoi_le)
  where merci_envoi_le is not null and merci_envoye_le is null;

-- ─────────────────────────────────────────────────────────────
-- L'invité laisse son adresse, s'il le veut
--
-- Le consentement est l'acte lui-même : il tape son adresse pour recevoir la
-- galerie. Elle ne sert qu'à ça et au mot des mariés. Elle n'entre pas dans
-- le fichier clients, et elle disparaît avec l'événement.
-- ─────────────────────────────────────────────────────────────

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

-- ─────────────────────────────────────────────────────────────
-- Combien d'invités recevront le mot
--
-- Les mariés doivent voir ce nombre AVANT de programmer : écrire un message
-- pour trois personnes ou pour quatre-vingts, ce n'est pas le même message.
-- ─────────────────────────────────────────────────────────────

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

-- ─────────────────────────────────────────────────────────────
-- La tâche horaire
--
-- Horaire et non quotidienne : les mariés choisissent une heure précise, et
-- un mot de remerciement qui arrive avec douze heures de retard rate
-- exactement le moment qu'on visait.
--
-- La clé de service est lue dans le coffre, jamais écrite ici : une clé dans
-- une migration est une clé publiée dans l'historique Git.
-- ─────────────────────────────────────────────────────────────

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
