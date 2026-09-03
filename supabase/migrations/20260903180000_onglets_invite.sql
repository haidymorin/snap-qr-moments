-- La page invité : ce que la formule autorise, et ce que ce téléphone a déposé.
--
-- Deux manques, tous deux visibles depuis la page que voient les invités.
--
-- 1. `guest_get_event` ne disait pas quelle formule avait été payée. La
--    recherche par visage s'affichait donc sur un Essentiel à 59 €, qui ne
--    l'inclut pas : une promesse non tenue côté offre, et des images envoyées
--    chez Amazon pour un événement qui ne les a pas payées.
--
-- 2. Un invité n'avait aucun moyen de vérifier que son dépôt était bien
--    arrivé. Il ne se connecte pas, on ne sait donc pas qui il est — mais son
--    téléphone, lui, se souvient de ce qu'il a envoyé. La liste des
--    identifiants est gardée dans le navigateur, et cette fonction se contente
--    de rendre les lignes correspondantes, à condition qu'elles appartiennent
--    bien à l'événement demandé.

create or replace function public.guest_get_event(p_event_id uuid)
returns table (id uuid, name text, event_date date, event_type text, plan text)
language sql stable security definer set search_path = public, pg_temp
as $$
  select e.id, e.name, e.event_date, e.event_type, e.plan
  from public.events e
  where e.id = p_event_id
    and e.statut = 'actif'
    and (e.expire_le is null or e.expire_le >= current_date);
$$;

grant execute on function public.guest_get_event(uuid) to anon, authenticated;

/* Les identifiants viennent du navigateur : ils ne prouvent rien. La borne est
   ailleurs — on ne rend que des lignes de CET événement, et seulement s'il est
   ouvert. Connaître l'identifiant d'une photo d'un autre mariage ne donne donc
   accès à rien. */
create or replace function public.guest_list_by_ids(
  p_event_id uuid,
  p_ids uuid[]
)
returns setof public.photos
language sql stable security definer set search_path = public, pg_temp
as $$
  select p.*
  from public.photos p
  where p.event_id = p_event_id
    and p.id = any(p_ids)
    and public.evenement_actif(p_event_id)
  order by p.created_at desc
  limit 500;
$$;

revoke execute on function public.guest_list_by_ids(uuid, uuid[]) from public;
grant execute on function public.guest_list_by_ids(uuid, uuid[]) to anon, authenticated;
