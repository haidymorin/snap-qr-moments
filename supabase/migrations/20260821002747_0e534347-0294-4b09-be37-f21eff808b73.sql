BEGIN;

DROP POLICY IF EXISTS "Events are viewable by anyone" ON public.events;

CREATE POLICY "Owners can view own events"
  ON public.events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Photos are viewable by anyone" ON public.photos;

CREATE POLICY "Owners can view own event photos"
  ON public.photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.events e
            WHERE e.id = photos.event_id AND e.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Anyone can upload photos" ON public.photos;

CREATE POLICY "Guests can add media to an existing event"
  ON public.photos FOR INSERT
  TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = photos.event_id));

CREATE OR REPLACE FUNCTION public.guest_get_event(p_event_id uuid)
RETURNS TABLE (id uuid, name text, event_date date, event_type text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT e.id, e.name, e.event_date, e.event_type
  FROM public.events e WHERE e.id = p_event_id;
$$;

CREATE OR REPLACE FUNCTION public.guest_list_media(
  p_event_id uuid, p_media text DEFAULT 'all',
  p_limit integer DEFAULT 24, p_offset integer DEFAULT 0)
RETURNS TABLE (id uuid, url text, thumbnail_url text,
               file_name text, media_type text, uploaded_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT p.id, p.url, p.thumbnail_url, p.file_name, p.media_type, p.uploaded_at
  FROM public.photos p
  WHERE p.event_id = p_event_id
    AND (p_media = 'all' OR p.media_type = p_media)
  ORDER BY p.uploaded_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit,24),1),100)
  OFFSET GREATEST(COALESCE(p_offset,0),0);
$$;

CREATE OR REPLACE FUNCTION public.guest_count_media(
  p_event_id uuid, p_media text DEFAULT 'all')
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT count(*)::integer FROM public.photos p
  WHERE p.event_id = p_event_id
    AND (p_media = 'all' OR p.media_type = p_media);
$$;

REVOKE EXECUTE ON FUNCTION public.guest_get_event(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.guest_list_media(uuid, text, integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.guest_count_media(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.guest_get_event(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_list_media(uuid, text, integer, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_count_media(uuid, text) TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can self-register as guest" ON public.guest_contacts;
DROP POLICY IF EXISTS "Anyone can mark uploaded" ON public.guest_contacts;

REVOKE SELECT, INSERT, UPDATE ON public.guest_contacts FROM anon;

CREATE OR REPLACE FUNCTION public.guest_self_register(
  p_event_id uuid, p_email text DEFAULT NULL, p_phone text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.events e WHERE e.id = p_event_id) THEN
    RAISE EXCEPTION 'unknown event';
  END IF;
  IF p_email IS NULL AND p_phone IS NULL THEN RETURN; END IF;
  INSERT INTO public.guest_contacts (event_id, email, phone, source)
  VALUES (p_event_id, NULLIF(trim(p_email),''), NULLIF(trim(p_phone),''), 'self')
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guest_self_register(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guest_self_register(uuid, text, text) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Event photos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload event photos" ON storage.objects;

CREATE POLICY "Guests can upload into a real event folder"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'event-photos'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.events e
                WHERE e.id::text = (storage.foldername(name))[1])
  );

CREATE POLICY "Owners can read their own event files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'event-photos'
    AND EXISTS (SELECT 1 FROM public.events e
                WHERE e.id::text = (storage.foldername(name))[1]
                  AND e.user_id = auth.uid())
  );

COMMIT;