create or replace function public.event_exists(p_event_id uuid)
returns boolean language sql security definer stable
set search_path = public
as $$ select exists (select 1 from public.events where id = p_event_id) $$;

grant execute on function public.event_exists(uuid) to anon, authenticated;

drop policy if exists "guests_upload" on storage.objects;
create policy "guests_upload" on storage.objects
for insert to anon, authenticated
with check (bucket_id = 'event-photos');

drop policy if exists "guests_read" on storage.objects;
create policy "guests_read" on storage.objects
for select to anon, authenticated
using (bucket_id = 'event-photos');

drop policy if exists "guests_add_photo" on public.photos;
create policy "guests_add_photo" on public.photos
for insert to anon, authenticated
with check (public.event_exists(event_id));

grant insert on public.photos to anon, authenticated;