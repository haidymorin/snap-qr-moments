
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by owner"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL,
  unique_code TEXT NOT NULL UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Events are publicly viewable (needed for guest page)
CREATE POLICY "Events are viewable by anyone"
  ON public.events FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create events"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update own events"
  ON public.events FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can delete own events"
  ON public.events FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Photos table
CREATE TABLE public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_photos_event_id ON public.photos(event_id);

ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- Photos publicly viewable
CREATE POLICY "Photos are viewable by anyone"
  ON public.photos FOR SELECT
  USING (true);

-- Anyone (including guests) can upload photos to existing events
CREATE POLICY "Anyone can upload photos"
  ON public.photos FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.events WHERE id = event_id));

-- Only event owner can delete photos
CREATE POLICY "Event owners can delete photos"
  ON public.photos FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND user_id = auth.uid()));

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket for event photos (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-photos', 'event-photos', true);

-- Storage policies
CREATE POLICY "Event photos are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-photos');

CREATE POLICY "Anyone can upload event photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'event-photos');

CREATE POLICY "Event owners can delete photos from storage"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'event-photos'
    AND EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id::text = (storage.foldername(name))[1]
      AND events.user_id = auth.uid()
    )
  );
