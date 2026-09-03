-- ─────────────────────────────────────────────────────────────
-- Le rappel trente jours avant la fermeture d'une galerie
--
-- L'hébergement dure six mois. Sans rappel, la galerie se ferme un matin
-- sans que personne n'ait rien vu venir. Trente jours, c'est assez pour tout
-- télécharger tranquillement, ou pour prolonger.
--
-- Une seule colonne ici : la date d'envoi. C'est elle qui garantit qu'un
-- client ne reçoit pas le même rappel tous les jours pendant un mois.
-- ─────────────────────────────────────────────────────────────

alter table public.events
  add column if not exists rappel_envoye_le timestamptz;

create index if not exists events_rappel_a_faire_idx
  on public.events (expire_le)
  where rappel_envoye_le is null and expire_le is not null;

-- ─────────────────────────────────────────────────────────────
-- La tâche quotidienne
--
-- Elle n'est posée que si l'extension existe sur ce projet ; sinon la
-- migration passe sans rien casser et la planification se fera à la main.
--
-- La clé de service ne figure PAS dans ce fichier : elle est lue dans le
-- coffre (Vault), sous le nom `service_role_key`. Écrire une clé en clair
-- dans une migration reviendrait à la publier dans l'historique Git.
-- ─────────────────────────────────────────────────────────────

do $$
declare
  a_le_coffre boolean;
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    raise notice 'pg_cron indisponible : le rappel devra être planifié autrement.';
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

  if exists (select 1 from cron.job where jobname = 'rappel-echeance') then
    perform cron.unschedule('rappel-echeance');
  end if;

  -- 7 h 30 UTC, soit le milieu de matinée en France : un rappel qui arrive
  -- la nuit se lit le lendemain, noyé sous le reste.
  perform cron.schedule(
    'rappel-echeance',
    '30 7 * * *',
    $tache$
    select net.http_post(
      url := 'https://suewfrgrddcuqphwegtn.supabase.co/functions/v1/rappel-echeance',
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
