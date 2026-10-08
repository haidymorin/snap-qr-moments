-- ─────────────────────────────────────────────────────────────
-- Ce que les formules promettent, et que le code ne tenait pas encore
--
-- Audit du 8 octobre 2026 : chaque ligne des trois formules relue contre le
-- code. Trois promesses n'étaient pas tenues, ce fichier en porte la partie
-- base de données.
--
--   1. Le livre d'or du Souvenir est vendu « écrit, vocal et vidéo ». La vidéo
--      n'existait nulle part.
--   2. L'invité qui laisse son adresse lit « vous recevrez le lien de la
--      galerie ». L'e-mail ne partait que si les mariés avaient écrit un mot ;
--      sans mot, rien. Et un invité inscrit après l'envoi ne recevait rien non
--      plus.
--   3. L'album de l'Héritage se compose en ligne, mais rien ne permettait aux
--      mariés de dire « c'est prêt », ni à l'administratrice de le savoir.
-- ─────────────────────────────────────────────────────────────


-- ═════════════════════════════════════════════════════════════
-- 1. Le livre d'or en vidéo
--
-- Même logique que le vocal : le fichier part du téléphone vers R2, la ligne
-- ne garde que l'adresse. L'aperçu (poster) est fabriqué sur le téléphone,
-- comme pour les vidéos de la galerie, pour que la liste des messages ne
-- télécharge pas cinquante vidéos d'un coup.
-- ═════════════════════════════════════════════════════════════

alter table public.livre_dor
  add column if not exists video_url        text,
  add column if not exists video_poster_url text,
  add column if not exists video_secondes   integer;

-- Un message reste valable s'il porte des mots, une voix ou une vidéo.
alter table public.livre_dor drop constraint if exists livre_dor_non_vide;
alter table public.livre_dor add constraint livre_dor_non_vide check (
  coalesce(nullif(trim(texte), ''), audio_url, video_url) is not null
);

-- Trois minutes : un message, pas un film. La limite est aussi vérifiée sur
-- le téléphone, avant l'envoi ; celle-ci est la dernière ligne de défense.
alter table public.livre_dor drop constraint if exists livre_dor_video_courte;
alter table public.livre_dor add constraint livre_dor_video_courte check (
  video_secondes is null or video_secondes between 0 and 180
);

-- La fonction de lecture des invités change de forme (trois colonnes de
-- plus) : Postgres impose de la supprimer avant de la recréer.
drop function if exists public.guest_list_livre_dor(uuid, integer, integer);

create function public.guest_list_livre_dor(
  p_event_id uuid,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid, auteur text, texte text,
  audio_url text, audio_secondes integer,
  video_url text, video_poster_url text, video_secondes integer,
  photo_url text, photo_thumb_url text,
  created_at timestamptz
)
language sql stable security definer set search_path = public, pg_temp
as $$
  select m.id, m.auteur, m.texte, m.audio_url, m.audio_secondes,
         m.video_url, m.video_poster_url, m.video_secondes,
         m.photo_url, m.photo_thumb_url, m.created_at
  from public.livre_dor m
  join public.events e on e.id = m.event_id
  where m.event_id = p_event_id
    and m.masque = false
    and e.livre_dor_public
    and public.livre_dor_ouvert(p_event_id)
  order by m.created_at desc
  limit least(coalesce(p_limit, 50), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke execute on function public.guest_list_livre_dor(uuid, integer, integer) from public;
grant execute on function public.guest_list_livre_dor(uuid, integer, integer) to anon, authenticated;


-- ═════════════════════════════════════════════════════════════
-- 2. Le lien de la galerie, envoyé à chaque invité qui l'a demandé
--
-- La colonne `last_reminded_at` existait depuis juin sans jamais servir. Elle
-- devient le marqueur d'envoi, invité par invité : la tâche horaire envoie à
-- ceux qui ne l'ont pas encore reçu, et uniquement à eux. C'est ce qui permet
-- à l'invité qui laisse son adresse trois jours après la fête de recevoir
-- quand même son lien, sans renvoyer le message aux quatre-vingts autres.
--
-- Les événements déjà passés ne doivent pas déclencher une vague d'e-mails au
-- moment où cette migration s'applique : leurs invités sont marqués comme
-- servis. Seuls les événements d'aujourd'hui et à venir suivent la nouvelle
-- règle.
-- ═════════════════════════════════════════════════════════════

update public.guest_contacts g
   set last_reminded_at = now()
  from public.events e
 where e.id = g.event_id
   and g.last_reminded_at is null
   and e.event_date < current_date;

create index if not exists guest_contacts_a_servir_idx
  on public.guest_contacts (event_id)
  where last_reminded_at is null and email is not null;


-- ═════════════════════════════════════════════════════════════
-- 3. L'album validé par les mariés
--
-- Trois états, portés par deux dates :
--   · en cours        album_valide_le est vide — les mariés composent ;
--   · validé          album_valide_le est rempli — l'administratrice est
--                     prévenue par e-mail (album_notifie_le), l'album se
--                     télécharge dans l'ordre pour l'imprimeur ;
--   · à l'impression  album_imprime_le est rempli — plus rien ne bouge.
--
-- Tant que l'album n'est pas parti à l'impression, les mariés peuvent le
-- rouvrir. Après, non : on ne modifie pas un livre déjà en fabrication.
-- ═════════════════════════════════════════════════════════════

alter table public.events
  add column if not exists album_valide_le  timestamptz,
  add column if not exists album_notifie_le timestamptz,
  add column if not exists album_imprime_le timestamptz;

create or replace function public.album_valider(p_event uuid)
returns timestamptz
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_quand timestamptz := now();
begin
  if not exists (
    select 1 from public.events e
     where e.id = p_event and (e.user_id = auth.uid() or public.est_admin())
  ) then raise exception 'acces_refuse'; end if;

  if not exists (select 1 from public.album_pages a where a.event_id = p_event) then
    raise exception 'album_vide';
  end if;

  update public.events
     set album_valide_le = v_quand, album_notifie_le = null
   where id = p_event and album_imprime_le is null;
  if not found then raise exception 'deja_imprime'; end if;

  return v_quand;
end $$;

create or replace function public.album_rouvrir(p_event uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  update public.events
     set album_valide_le = null, album_notifie_le = null
   where id = p_event
     and (user_id = auth.uid() or public.est_admin())
     and album_imprime_le is null;
  if not found then raise exception 'deja_imprime'; end if;
end $$;

-- Réservé à l'administratrice : c'est elle qui envoie le fichier à Gelato.
create or replace function public.album_marquer_imprime(p_event uuid, p_imprime boolean)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.est_admin() then raise exception 'acces_refuse'; end if;
  update public.events
     set album_imprime_le = case when p_imprime then now() else null end
   where id = p_event and album_valide_le is not null;
  if not found then raise exception 'album_non_valide'; end if;
end $$;

revoke execute on function public.album_valider(uuid) from public;
revoke execute on function public.album_rouvrir(uuid) from public;
revoke execute on function public.album_marquer_imprime(uuid, boolean) from public;
grant execute on function public.album_valider(uuid) to authenticated;
grant execute on function public.album_rouvrir(uuid) to authenticated;
grant execute on function public.album_marquer_imprime(uuid, boolean) to authenticated;

/* Un album validé ne se modifie plus par la table non plus : sans ce verrou,
   il suffirait d'un onglet resté ouvert pour changer un album que
   l'administratrice est en train d'envoyer à l'imprimeur. L'administratrice,
   elle, garde la main. */
drop policy if exists "les mariés composent leur album" on public.album_pages;
create policy "les mariés composent leur album" on public.album_pages
  for all to authenticated
  using (exists (select 1 from public.events e
                 where e.id = event_id
                   and ((e.user_id = auth.uid() and e.album_valide_le is null)
                        or public.est_admin())))
  with check (exists (select 1 from public.events e
                      where e.id = event_id
                        and ((e.user_id = auth.uid() and e.album_valide_le is null)
                             or public.est_admin())));

create or replace function public.album_composer(
  p_event        uuid,
  p_cible        integer default 60,
  p_graine       integer default 0,
  p_prioritaires uuid[]  default '{}'::uuid[]
)
returns integer
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_n integer;
begin
  if not exists (select 1 from public.events e
                 where e.id = p_event
                   and ((e.user_id = auth.uid() and e.album_valide_le is null)
                        or public.est_admin())) then
    raise exception 'Cet album ne vous appartient pas, ou il est déjà validé';
  end if;

  delete from public.album_pages where event_id = p_event;

  insert into public.album_pages (event_id, position, genre, photo_id)
  select p_event, s.rang, 'photo', s.photo_id
  from public.album_suggerer(p_event, p_cible, p_graine, p_prioritaires) s;

  get diagnostics v_n = row_count;
  return v_n;
end $$;

create or replace function public.album_reordonner(p_event uuid, p_ordre uuid[])
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not exists (select 1 from public.events e
                 where e.id = p_event
                   and ((e.user_id = auth.uid() and e.album_valide_le is null)
                        or public.est_admin())) then
    raise exception 'Cet album ne vous appartient pas, ou il est déjà validé';
  end if;

  update public.album_pages a
  set position = o.rang
  from (select unnest(p_ordre) as id, generate_subscripts(p_ordre, 1) as rang) o
  where a.id = o.id and a.event_id = p_event;
end $$;
