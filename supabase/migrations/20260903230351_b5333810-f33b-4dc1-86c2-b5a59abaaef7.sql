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

drop policy if exists "admin lit les demandes" on public.demandes_contact;
create policy "admin lit les demandes"
  on public.demandes_contact for select
  to authenticated
  using (public.est_admin());

drop policy if exists "admin marque les demandes" on public.demandes_contact;
create policy "admin marque les demandes"
  on public.demandes_contact for update
  to authenticated
  using (public.est_admin())
  with check (public.est_admin());