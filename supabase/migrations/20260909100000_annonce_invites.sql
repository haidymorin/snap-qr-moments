-- ─────────────────────────────────────────────────────────────
-- L'annonce aux invités
--
-- Les mariés veulent pouvoir dire quelque chose à toute la salle : « la pièce
-- montée arrive », « on se retrouve dehors pour la photo de groupe », « pensez
-- à envoyer vos photos avant de partir ». Aujourd'hui ils passent par le DJ,
-- ou ils crient.
--
-- Ce n'est PAS une notification push, et c'est un choix technique, pas une
-- facilité. Une vraie notification push exige, sur iPhone, que le site ait été
-- ajouté à l'écran d'accueil : aucun invité de mariage ne fera ça. La
-- permission serait demandée à tout le monde, refusée par presque tous, et le
-- message n'arriverait qu'à une poignée de téléphones Android.
--
-- Donc : un bandeau dans la page. Les invités gardent l'onglet ouvert pendant
-- la soirée — c'est là qu'ils déposent leurs photos. La page interroge le
-- serveur toutes les vingt secondes ; le message apparaît en haut, une fois,
-- et se ferme d'un bouton. Un nouveau message le fait réapparaître, parce que
-- c'est « annonce_depuis » qui sert de clé, pas le texte.
--
-- Aucune donnée d'invité n'est stockée au passage : le renvoi du bandeau est
-- décidé dans le navigateur, pas côté serveur.
-- ─────────────────────────────────────────────────────────────

alter table public.events
  add column if not exists annonce_texte  text,
  add column if not exists annonce_depuis timestamptz;

-- Un message court : au-delà, ce n'est plus une annonce, c'est un discours,
-- et personne ne le lit sur un téléphone à minuit.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'events_annonce_longueur') then
    alter table public.events
      add constraint events_annonce_longueur
      check (annonce_texte is null or char_length(annonce_texte) <= 180);
  end if;
end $$;

-- La lecture côté invité : uniquement le texte et sa date, pour un événement
-- actif et non expiré. Rien d'autre ne sort de la table.
create or replace function public.guest_annonce(p_event_id uuid)
returns table (texte text, depuis timestamptz)
language sql stable security definer set search_path = public, pg_temp
as $$
  select e.annonce_texte, e.annonce_depuis
  from public.events e
  where e.id = p_event_id
    and e.statut = 'actif'
    and (e.expire_le is null or e.expire_le >= current_date)
    and e.annonce_texte is not null;
$$;

revoke all on function public.guest_annonce(uuid) from public;
grant execute on function public.guest_annonce(uuid) to anon, authenticated;

comment on function public.guest_annonce(uuid) is
  'Le message affiché en haut de la page des invités. Lecture publique, volontairement limitée à deux colonnes.';
