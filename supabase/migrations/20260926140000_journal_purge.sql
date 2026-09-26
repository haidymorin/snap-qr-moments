-- ─────────────────────────────────────────────────────────────
-- Le journal des purges
--
-- Une purge qui tourne sans laisser de trace ne vaut pas grand-chose le jour
-- où quelqu'un demande des comptes : les journaux techniques ne remontent
-- qu'à quelques heures, et la réponse de la fonction n'est conservée nulle
-- part. Cette table est la preuve écrite que la promesse des conditions de
-- vente a été tenue, nuit après nuit.
--
-- Elle ne contient que des nombres et un éventuel message d'erreur : aucune
-- donnée d'invité, aucun identifiant de photo. Ce qui a été effacé doit le
-- rester, y compris dans le journal qui le raconte.
-- ─────────────────────────────────────────────────────────────

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

-- Seule la fonction de purge écrit ici (elle utilise la clé de service, qui
-- ignore ces règles). Côté site, personne ne lit ce journal sauf un
-- administrateur : c'est un document de conformité, pas une donnée client.
alter table public.journal_purge enable row level security;

drop policy if exists "journal purge lisible par les admins" on public.journal_purge;
create policy "journal purge lisible par les admins"
  on public.journal_purge for select
  to authenticated
  using (public.est_admin());
