
CREATE TABLE public.guest_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  email text,
  phone text,
  source text NOT NULL DEFAULT 'manual',
  uploaded boolean NOT NULL DEFAULT false,
  last_reminded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX guest_contacts_event_email_idx
  ON public.guest_contacts (event_id, lower(email))
  WHERE email IS NOT NULL;

CREATE INDEX guest_contacts_event_idx ON public.guest_contacts (event_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.guest_contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.guest_contacts TO anon;
GRANT ALL ON public.guest_contacts TO service_role;

ALTER TABLE public.guest_contacts ENABLE ROW LEVEL SECURITY;

-- Owners can fully manage their event's guest list
CREATE POLICY "Owners manage guests"
  ON public.guest_contacts
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = guest_contacts.event_id AND e.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = guest_contacts.event_id AND e.user_id = auth.uid()));

-- Anyone (guests on QR page) can register themselves
CREATE POLICY "Anyone can self-register as guest"
  ON public.guest_contacts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = guest_contacts.event_id));

-- Anyone can mark themselves as uploaded (used on guest page after upload)
CREATE POLICY "Anyone can mark uploaded"
  ON public.guest_contacts
  FOR UPDATE
  TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = guest_contacts.event_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = guest_contacts.event_id));
