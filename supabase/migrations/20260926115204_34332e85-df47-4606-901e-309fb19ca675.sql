create table if not exists public.journal_purge (
  id                    bigint generated always as identity primary key,
  execute_le            timestamptz not null default now(),
  empreintes_supprimees integer not null default 0,
  collections_supprimees integer not null default 0,
  fichiers_supprimes    integer not null default 0,
  echecs                integer not null default 0,
  erreur                text
);

comment on table public.journal_purge is
  'Une ligne par exécution de la purge nocturne. Preuve durable que les photos et empreintes arrivées à échéance ont bien été supprimées.';

create index if not exists journal_purge_date_idx
  on public.journal_purge (execute_le desc);

GRANT SELECT ON public.journal_purge TO authenticated;
GRANT ALL ON public.journal_purge TO service_role;

alter table public.journal_purge enable row level security;

drop policy if exists "journal purge lisible par les admins" on public.journal_purge;
create policy "journal purge lisible par les admins"
  on public.journal_purge for select
  to authenticated
  using (public.est_admin());