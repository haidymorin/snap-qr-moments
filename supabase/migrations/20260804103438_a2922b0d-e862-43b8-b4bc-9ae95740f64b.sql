ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'photo';

UPDATE public.photos SET media_type = 'photo' WHERE media_type IS NULL OR media_type NOT IN ('photo','video');

ALTER TABLE public.photos
  ADD CONSTRAINT photos_media_type_check CHECK (media_type IN ('photo','video'));

CREATE INDEX IF NOT EXISTS photos_event_media_idx ON public.photos (event_id, media_type, uploaded_at DESC);