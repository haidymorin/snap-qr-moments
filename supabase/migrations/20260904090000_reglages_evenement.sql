-- Ce que les hôtes décident eux-mêmes.
--
-- Deux réglages manquaient, et ce sont les deux seuls qui changent vraiment
-- quelque chose pour les invités.
--
--   La fin de la collecte. Les photos n'arrivent pas pendant la fête : elles
--   arrivent le lendemain, dans le train du retour, le dimanche soir. Fermer
--   à minuit ferait perdre la moitié de la galerie. Sept jours après
--   l'événement, par défaut, et le couple peut allonger.
--
--   Le message d'accueil. C'est la première phrase que lit quelqu'un qui vient
--   de scanner un carton posé sur une table. Personne ne la dira mieux que les
--   mariés eux-mêmes.
--
-- Les autres réglages du livre d'or existent déjà. Volontairement absents :
-- la modération des photos, qui viderait la galerie pendant la fête, et le
-- téléchargement par les invités, qui est ce qui les fait revenir.

alter table public.events
  add column if not exists collecte_fin     date,
  add column if not exists message_accueil  text;

comment on column public.events.collecte_fin is
  'Dernier jour où les invités peuvent déposer. Vide = sept jours après l''événement.';

/* Sept jours après la date de l'événement, sauf décision contraire. La règle
   est écrite une fois, ici, plutôt que recopiée dans chaque politique. */
create or replace function public.collecte_ouverte(p_event_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id
      and e.statut = 'actif'
      and (e.expire_le is null or e.expire_le >= current_date)
      and current_date <= coalesce(e.collecte_fin, e.event_date + 7)
  );
$$;

grant execute on function public.collecte_ouverte(uuid) to anon, authenticated;

/* Le dépôt suit la fenêtre de collecte, pas seulement la validité de
   l'événement : une galerie reste consultable six mois, mais on n'y ajoute
   pas des photos six mois plus tard. */
drop policy if exists "Depot autorise seulement sur un evenement ouvert" on public.photos;
create policy "Depot autorise pendant la fenetre de collecte"
  on public.photos for insert to anon, authenticated
  with check (public.collecte_ouverte(event_id));

/* La page invité a besoin de tout savoir d'un coup : ce qu'elle peut proposer,
   ce que le couple a écrit, et si le dépôt est encore ouvert. */
create or replace function public.guest_reglages(p_event_id uuid)
returns table (
  livre_dor boolean,
  vocal boolean,
  messages_publics boolean,
  collecte_ouverte boolean,
  collecte_fin date,
  message_accueil text
)
language sql stable security definer set search_path = public, pg_temp
as $$
  select public.livre_dor_ouvert(p_event_id),
         e.livre_dor_vocal,
         e.livre_dor_public,
         public.collecte_ouverte(p_event_id),
         coalesce(e.collecte_fin, e.event_date + 7),
         nullif(trim(coalesce(e.message_accueil, '')), '')
  from public.events e
  where e.id = p_event_id;
$$;

grant execute on function public.guest_reglages(uuid) to anon, authenticated;

/* Ce que l'administratrice voit : tous les événements, avec leur client et ce
   qu'ils ont rapporté. Une fonction plutôt qu'une vue, pour que le contrôle du
   rôle soit dans le même objet que la donnée — une vue se lit avec les droits
   de celui qui l'interroge, et il serait trop facile d'en ouvrir l'accès par
   inadvertance. */
create or replace function public.admin_evenements()
returns table (
  id uuid, name text, event_date date, event_type text,
  plan text, statut text, paye_le timestamptz, expire_le date,
  email text, medias bigint, messages bigint, montant_centimes integer
)
language sql stable security definer set search_path = public, pg_temp
as $$
  select e.id, e.name, e.event_date, e.event_type,
         e.plan, e.statut, e.paye_le, e.expire_le,
         p.email,
         (select count(*) from public.photos ph where ph.event_id = e.id),
         (select count(*) from public.livre_dor m where m.event_id = e.id),
         pa.montant_centimes
  from public.events e
  left join public.profiles p on p.id = e.user_id
  left join public.paiements pa on pa.event_id = e.id
  where public.est_admin()
  order by coalesce(e.paye_le, e.created_at) desc;
$$;

revoke execute on function public.admin_evenements() from public, anon;
grant execute on function public.admin_evenements() to authenticated;
