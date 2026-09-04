-- ─────────────────────────────────────────────────────────────
-- Le fichier clients
--
-- Jusqu'ici, la seule trace d'un acheteur était sa ligne chez Stripe. Utile
-- pour la comptabilité, inutilisable pour écrire à ses clients : on ne peut
-- pas relancer, on ne peut pas prévenir, on ne peut pas remercier.
--
-- Cette table garde les coordonnées saisies au premier pas du parcours
-- d'achat, AVANT le paiement. C'est délibéré : une personne qui remplit son
-- nom et sa date puis abandonne devant la page bancaire est le prospect le
-- plus qualifié qui existe, et sans cette écriture on ne saurait même pas
-- qu'elle est passée.
--
-- Deux garde-fous, parce que garder des coordonnées engage :
--   · la prospection commerciale est une colonne à part, avec sa date. Le
--     formulaire propose une case d'OPPOSITION, pas de consentement : la loi
--     l'autorise pour ses propres clients, sur des produits analogues
--     (art. L34-5 du code des postes). Pour une personne qui n'a jamais
--     acheté, cette tolérance ne s'applique pas — d'où le croisement avec
--     a_achete au moment d'exporter.
--   · la table est fermée. Aucune politique ne l'ouvre à qui que ce soit
--     d'autre qu'un administrateur ; l'écriture ne passe que par la fonction
--     ci-dessous, qui n'accepte rien d'autre que ce dont elle a besoin.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.clients (
  id                     uuid primary key default gen_random_uuid(),
  email                  text        not null,
  prenom                 text,
  nom                    text,
  telephone              text,

  -- La prospection commerciale, séparée de tout le reste. Vraie par défaut :
  -- c'est une case d'opposition, cochée par la personne qui ne veut rien
  -- recevoir. Ce qui décide vraiment de l'envoi, c'est le croisement avec
  -- a_achete au moment de l'export.
  marketing              boolean     not null default true,
  marketing_le           timestamptz,

  -- Ce qu'on sait de son projet au moment où elle laisse ses coordonnées.
  evenement_nom          text,
  evenement_date         date,
  evenement_type         text,
  formule_envisagee      text,

  -- Renseigné par le webhook Stripe quand le paiement aboutit.
  a_achete               boolean     not null default false,
  premier_achat_le       timestamptz,

  origine                text        not null default 'parcours_achat',
  cree_le                timestamptz not null default now(),
  maj_le                 timestamptz not null default now()
);

create unique index if not exists clients_email_unique
  on public.clients (lower(email));

create index if not exists clients_marketing_idx
  on public.clients (marketing) where marketing;

alter table public.clients enable row level security;

-- Aucune politique d'insertion : on n'écrit ici que par la fonction plus bas.
drop policy if exists "admin lit les clients" on public.clients;
create policy "admin lit les clients" on public.clients
  for select to authenticated using (public.est_admin());

drop policy if exists "admin corrige les clients" on public.clients;
create policy "admin corrige les clients" on public.clients
  for update to authenticated using (public.est_admin()) with check (public.est_admin());

-- ─────────────────────────────────────────────────────────────
-- L'enregistrement, appelé depuis le parcours d'achat
--
-- La personne n'a pas de compte à ce stade : la fonction s'exécute donc avec
-- les droits du propriétaire. Elle ne renvoie rien d'exploitable et ne lit
-- jamais la table — impossible de s'en servir pour deviner si une adresse est
-- déjà cliente.
--
-- Un deuxième passage met à jour ce qui a changé sans effacer ce qu'on savait
-- déjà : coalesce partout, et le consentement ne retombe jamais à faux tout
-- seul — seule une demande explicite de désinscription doit pouvoir le faire.
-- ─────────────────────────────────────────────────────────────

create or replace function public.enregistrer_client(
  p_email     text,
  p_prenom    text default null,
  p_nom       text default null,
  p_telephone text default null,
  p_marketing boolean default null,
  p_ev_nom    text default null,
  p_ev_date   date default null,
  p_ev_type   text default null,
  p_formule   text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  -- Un contrôle volontairement grossier : la seule vérification qui vaille est
  -- l'email de confirmation qui part ensuite.
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$' or length(v_email) > 254 then
    raise exception 'email_invalide';
  end if;

  insert into public.clients as c (
    email, prenom, nom, telephone, marketing, marketing_le,
    evenement_nom, evenement_date, evenement_type, formule_envisagee
  )
  values (
    v_email,
    nullif(btrim(coalesce(p_prenom, '')), ''),
    nullif(btrim(coalesce(p_nom, '')), ''),
    nullif(btrim(coalesce(p_telephone, '')), ''),
    coalesce(p_marketing, true),
    case when coalesce(p_marketing, true) then now() end,
    nullif(btrim(coalesce(p_ev_nom, '')), ''),
    p_ev_date,
    nullif(btrim(coalesce(p_ev_type, '')), ''),
    nullif(btrim(coalesce(p_formule, '')), '')
  )
  on conflict (lower(email)) do update set
    prenom            = coalesce(excluded.prenom, c.prenom),
    nom               = coalesce(excluded.nom, c.nom),
    telephone         = coalesce(excluded.telephone, c.telephone),
    -- Un appel qui ne dit rien de la prospection ne doit pas la réinitialiser :
    -- le webhook Stripe repasse ici après le paiement sans rien en savoir.
    marketing         = coalesce(p_marketing, c.marketing),
    marketing_le      = case
                          when coalesce(p_marketing, c.marketing) and not c.marketing
                            then now()
                          else c.marketing_le
                        end,
    evenement_nom     = coalesce(excluded.evenement_nom, c.evenement_nom),
    evenement_date    = coalesce(excluded.evenement_date, c.evenement_date),
    evenement_type    = coalesce(excluded.evenement_type, c.evenement_type),
    formule_envisagee = coalesce(excluded.formule_envisagee, c.formule_envisagee),
    maj_le            = now();
end;
$$;

grant execute on function public.enregistrer_client(
  text, text, text, text, boolean, text, date, text, text
) to anon, authenticated;

-- Les lignes déjà en base sous l'ancienne règle restent à false : on ne
-- requalifie pas rétroactivement un silence en acceptation.

-- ─────────────────────────────────────────────────────────────
-- La désinscription
--
-- Un lien dans chaque email doit pouvoir l'appeler sans compte et sans clé.
-- Elle ne dit jamais si l'adresse existait : répondre « inconnue » à une
-- adresse et « c'est fait » à une autre transformerait ce lien en annuaire.
-- ─────────────────────────────────────────────────────────────

create or replace function public.desinscrire_client(p_email text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.clients
     set marketing = false, maj_le = now()
   where lower(email) = lower(btrim(coalesce(p_email, '')));
$$;

grant execute on function public.desinscrire_client(text) to anon, authenticated;
