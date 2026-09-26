-- ─────────────────────────────────────────────────────────────
-- La purge devient complète
--
-- Le premier test de bout en bout a montré trois manques : les fichiers
-- partaient mais les fiches restaient (galerie fantôme d'images cassées,
-- livre d'or et adresses d'invités conservés) ; la purge se basait sur la
-- date du mariage et non sur la date de fermeture de la galerie ; et un
-- événement sans reconnaissance faciale n'était jamais purgé du tout.
--
-- Ces deux colonnes accompagnent la correction côté fonction : la date de
-- purge sur l'événement, et le nombre d'événements purgés dans le journal.
-- ─────────────────────────────────────────────────────────────

alter table public.events
  add column if not exists purge_le timestamptz;

comment on column public.events.purge_le is
  'Date à laquelle le contenu déposé par les invités a été effacé. L''événement, lui, reste : il porte la commande et la facture.';

alter table public.journal_purge
  add column if not exists evenements_purges integer not null default 0;
