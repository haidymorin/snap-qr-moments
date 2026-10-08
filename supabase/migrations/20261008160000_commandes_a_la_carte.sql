-- ─────────────────────────────────────────────────────────────
-- Les commandes après l'achat : produits à la carte et montée de formule
--
-- Jusqu'ici, seules les trois formules se payaient en ligne. La page Albums
-- présentait l'album à 129 €, le mini-album à 45 € et l'année d'hébergement
-- à 29 € sans aucun moyen de les acheter, et la FAQ promettait qu'on pouvait
-- « passer à une formule supérieure en ne payant que la différence » sans que
-- rien ne le permette. Ce fichier pose la table qui garde la trace de ces
-- commandes ; c'est le webhook Stripe qui l'écrit, jamais le navigateur.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.commandes (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid not null references public.events(id) on delete cascade,
  produit           text not null check (produit in ('album', 'mini_album', 'annee', 'montee')),
  quantite          integer not null default 1 check (quantite between 1 and 10),
  montant_centimes  integer not null check (montant_centimes >= 0),
  plan_avant        text,
  plan_cible        text,
  stripe_session_id text unique,
  statut            text not null default 'payee'
                    check (statut in ('payee', 'en_fabrication', 'expediee', 'livree', 'annulee')),
  adresse_livraison jsonb,
  email             text,
  -- Posé quand l'effet de la commande est appliqué (album débloqué, année
  -- ajoutée, formule changée) : un webhook rejoué ne l'applique pas deux fois.
  applique_le       timestamptz,
  cree_le           timestamptz not null default now()
);

create index if not exists commandes_event_idx on public.commandes (event_id, cree_le desc);

alter table public.commandes enable row level security;
grant all on public.commandes to service_role;
grant select on public.commandes to authenticated;

-- Les mariés voient leurs commandes ; l'administratrice voit tout. Personne
-- n'écrit depuis le navigateur : une commande naît d'un paiement.
drop policy if exists "les mariés voient leurs commandes" on public.commandes;
create policy "les mariés voient leurs commandes" on public.commandes
  for select to authenticated
  using (public.est_admin()
         or exists (select 1 from public.events e where e.id = event_id and e.user_id = auth.uid()));

-- L'administratrice fait avancer une commande (en fabrication, expédiée…).
create or replace function public.commande_statut(p_commande uuid, p_statut text)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.est_admin() then raise exception 'acces_refuse'; end if;
  if p_statut not in ('payee', 'en_fabrication', 'expediee', 'livree', 'annulee') then
    raise exception 'statut_inconnu';
  end if;
  update public.commandes set statut = p_statut where id = p_commande;
end $$;

revoke execute on function public.commande_statut(uuid, text) from public;
grant execute on function public.commande_statut(uuid, text) to authenticated;

-- Un album acheté à la carte ouvre l'outil de composition, comme l'Héritage.
alter table public.events
  add column if not exists album_achete boolean not null default false;

-- La composition de l'album s'ouvre aussi à ceux qui l'ont acheté à la carte
-- ou reçu en cadeau. Les fonctions de composition vérifiaient seulement la
-- propriété de l'événement ; c'est l'écran qui filtrait par formule, et il
-- consulte désormais ces deux colonnes en plus.
