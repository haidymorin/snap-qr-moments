-- Reconnaissance faciale — tables, règles d'accès et purge.
--
-- Principe de sécurité : AUCUNE de ces tables n'est lisible ni modifiable
-- depuis le navigateur. Elles ne portent aucune politique pour les rôles
-- `anon` et `authenticated`. Tout passe par les fonctions serveur, qui
-- utilisent la clé de service. Ce sont des données de l'article 9 du RGPD :
-- la règle par défaut est « personne », pas « tout le monde ».
--
-- Seule exception, tout en bas : une fonction qui laisse l'organisateur d'un
-- événement lire les prénoms des invités qui l'ont explicitement autorisé.

-- ---------------------------------------------------------------------------
-- 1. L'état d'indexation d'un événement
-- ---------------------------------------------------------------------------
-- Trois états, sans retour en arrière possible :
--   aucun    : rien n'a jamais été analysé, rien n'est facturé
--   en_cours : la collection vient d'être créée, l'analyse rétroactive tourne
--   actif    : chaque nouvelle photo est analysée à son arrivée

create table if not exists public.face_events (
  event_id        uuid primary key references public.events(id) on delete cascade,
  status          text not null default 'aucun'
                    check (status in ('aucun', 'en_cours', 'actif')),
  collection_id   text,
  indexed_photos  integer not null default 0,
  total_photos    integer not null default 0,
  activated_at    timestamptz,
  last_error      text,
  updated_at      timestamptz not null default now()
);

alter table public.face_events enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Les consentements
-- ---------------------------------------------------------------------------
-- Une ligne par invité qui s'est prêté au jeu. `browser_token` est un
-- identifiant aléatoire déposé dans son navigateur : il lui permet de revenir
-- et d'effacer son empreinte sans jamais créer de compte.
--
-- `allow_hosts` est la seconde finalité, facultative et distincte : sans elle,
-- les mariés ne peuvent pas chercher cette personne.
--
-- Le selfie lui-même n'apparaît nulle part : il n'est pas stocké.

create table if not exists public.face_consents (
  id                  uuid primary key default gen_random_uuid(),
  event_id            uuid not null references public.events(id) on delete cascade,
  browser_token       text not null,
  first_name          text not null check (length(trim(first_name)) between 1 and 60),
  allow_hosts         boolean not null default false,
  rekognition_face_id text,
  created_at          timestamptz not null default now(),
  last_used_at        timestamptz not null default now(),
  expires_at          timestamptz not null,
  unique (event_id, browser_token)
);

create index if not exists idx_face_consents_event on public.face_consents(event_id);
create index if not exists idx_face_consents_expiry on public.face_consents(expires_at);

alter table public.face_consents enable row level security;

-- ---------------------------------------------------------------------------
-- 3. Les visages détectés sur les photos
-- ---------------------------------------------------------------------------

create table if not exists public.photo_faces (
  id                  uuid primary key default gen_random_uuid(),
  photo_id            uuid not null references public.photos(id) on delete cascade,
  event_id            uuid not null references public.events(id) on delete cascade,
  rekognition_face_id text not null,
  created_at          timestamptz not null default now(),
  unique (photo_id, rekognition_face_id)
);

create index if not exists idx_photo_faces_event on public.photo_faces(event_id);
create index if not exists idx_photo_faces_face on public.photo_faces(rekognition_face_id);

alter table public.photo_faces enable row level security;

-- ---------------------------------------------------------------------------
-- 3 bis. Savoir quelles photos restent à analyser
-- ---------------------------------------------------------------------------
-- Une colonne sur `photos` plutôt qu'une sous-requête à chaque lot : c'est
-- indexable, ça ne grossit pas avec le nombre de photos, et ça survit à une
-- reprise après incident. `null` = jamais analysée.

alter table public.photos
  add column if not exists faces_indexed_at timestamptz;

create index if not exists idx_photos_a_analyser
  on public.photos(event_id) where faces_indexed_at is null;

-- ---------------------------------------------------------------------------
-- 4. Ce que l'organisateur a le droit de voir
-- ---------------------------------------------------------------------------
-- Uniquement les prénoms de ceux qui ont coché la case facultative, et
-- uniquement pour ses propres événements. Jamais les jetons de navigateur,
-- jamais les identifiants d'empreintes, et rien du tout sur les invités qui
-- n'ont pas accepté — leur absence de consentement reste invisible.

create or replace function public.host_list_consenting_guests(p_event_id uuid)
returns table (consent_id uuid, first_name text, created_at timestamptz)
language sql
security definer
stable
set search_path = public
as $$
  select c.id, c.first_name, c.created_at
  from public.face_consents c
  join public.events e on e.id = c.event_id
  where c.event_id = p_event_id
    and c.allow_hosts = true
    and c.rekognition_face_id is not null
    and e.user_id = auth.uid()
  order by c.first_name;
$$;

grant execute on function public.host_list_consenting_guests(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. La purge
-- ---------------------------------------------------------------------------
-- Supprime les consentements arrivés à échéance. Renvoie les identifiants
-- d'empreintes à retirer de la collection Rekognition : la fonction serveur
-- `face-cleanup` s'en sert pour faire le ménage CHEZ AMAZON AUSSI. Supprimer
-- seulement la ligne en base laisserait l'empreinte vivre chez le sous-traitant
-- — c'est l'erreur classique, et elle transforme un droit RGPD en mensonge.

create or replace function public.purge_expired_face_consents()
returns table (event_id uuid, collection_id text, rekognition_face_id text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with expired as (
    delete from public.face_consents c
    where c.expires_at < now()
      and c.rekognition_face_id is not null
    returning c.event_id, c.rekognition_face_id
  )
  select e.event_id, fe.collection_id, e.rekognition_face_id
  from expired e
  join public.face_events fe on fe.event_id = e.event_id;
end;
$$;

revoke all on function public.purge_expired_face_consents() from public, anon, authenticated;

comment on table public.face_consents is
  'Consentements à la reconnaissance faciale. Données biométriques au sens de
   l''article 9 du RGPD. Aucun accès direct depuis le navigateur : tout passe
   par les fonctions serveur. Le selfie n''est jamais conservé.';
