do $$
declare
  a_le_coffre boolean;
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    raise notice 'pg_cron indisponible : la purge devra être planifiée autrement.';
    return;
  end if;

  create extension if not exists pg_cron;
  create extension if not exists pg_net;

  select exists (
    select 1 from vault.decrypted_secrets where name = 'service_role_key'
  ) into a_le_coffre;

  if not a_le_coffre then
    raise notice 'Secret service_role_key absent du coffre : purge non planifiée.';
    return;
  end if;

  if exists (select 1 from cron.job where jobname = 'face-cleanup') then
    perform cron.unschedule('face-cleanup');
  end if;

  perform cron.schedule(
    'face-cleanup',
    '20 3 * * *',
    $tache$
    select net.http_post(
      url := 'https://suewfrgrddcuqphwegtn.supabase.co/functions/v1/face-cleanup',
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