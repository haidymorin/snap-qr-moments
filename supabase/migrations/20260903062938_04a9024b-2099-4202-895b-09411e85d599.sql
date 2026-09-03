drop function if exists public.guest_get_event(uuid);

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
  order by p.uploaded_at desc
  limit 500;
$$;

revoke execute on function public.guest_list_by_ids(uuid, uuid[]) from public;
grant execute on function public.guest_list_by_ids(uuid, uuid[]) to anon, authenticated;