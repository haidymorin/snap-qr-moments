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
  applique_le       timestamptz,
  cree_le           timestamptz not null default now()
);

create index if not exists commandes_event_idx on public.commandes (event_id, cree_le desc);

alter table public.commandes enable row level security;
grant all on public.commandes to service_role;
grant select on public.commandes to authenticated;

create policy "les mariés voient leurs commandes" on public.commandes
  for select to authenticated
  using (public.est_admin()
         or exists (select 1 from public.events e where e.id = event_id and e.user_id = auth.uid()));

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

alter table public.events
  add column if not exists album_achete boolean not null default false;