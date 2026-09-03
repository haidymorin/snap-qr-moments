-- ─────────────────────────────────────────────────────────────
-- Les demandes reçues par le formulaire de contact
--
-- Jusqu'ici, le formulaire ouvrait la messagerie du visiteur. Sur un
-- ordinateur sans messagerie configurée — la majorité — il ne se passait
-- rien du tout, et la demande était perdue sans que personne ne le sache.
--
-- Désormais elle est écrite ici AVANT que l'e-mail ne parte. C'est l'ordre
-- qui compte : si le service d'envoi tombe, la demande existe quand même et
-- se retrouve. L'inverse aurait perdu des clients sans laisser de trace.
--
-- Aucune politique d'insertion n'est déclarée : le navigateur n'écrit jamais
-- dans cette table. Seule la fonction serveur y accède, avec la clé de
-- service, après avoir vérifié ce qu'on lui envoie. Sans cela, l'adresse
-- serait un formulaire ouvert sur Internet.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.demandes_contact (
  id             uuid primary key default gen_random_uuid(),
  nom            text not null,
  email          text not null,
  type_evenement text,
  date_evenement date,
  message        text,
  origine        text,
  traitee_le     timestamptz,
  cree_le        timestamptz not null default now()
);

create index if not exists demandes_contact_cree_le_idx
  on public.demandes_contact (cree_le desc);

alter table public.demandes_contact enable row level security;

grant all on public.demandes_contact to service_role;
grant select, update on public.demandes_contact to authenticated;

-- Seule Haïdy lit ses demandes. Un client connecté n'a rien à y voir.
drop policy if exists "admin lit les demandes" on public.demandes_contact;
create policy "admin lit les demandes"
  on public.demandes_contact for select
  to authenticated
  using (public.est_admin());

-- Marquer une demande comme traitée, sans jamais pouvoir la réécrire.
drop policy if exists "admin marque les demandes" on public.demandes_contact;
create policy "admin marque les demandes"
  on public.demandes_contact for update
  to authenticated
  using (public.est_admin())
  with check (public.est_admin());
