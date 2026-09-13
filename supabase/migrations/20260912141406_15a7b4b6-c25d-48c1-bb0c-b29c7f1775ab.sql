alter table public.events
  add column if not exists signaletique jsonb not null default '{}'::jsonb;

comment on column public.events.signaletique is
  'Réglages d''impression de la signalétique : modèle, jeu de polices, jeu de couleurs, mot d''accueil, photo, affichage de la marque. État d''écran, jamais lu par une règle de sécurité.';