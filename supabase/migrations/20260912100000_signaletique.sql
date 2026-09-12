-- ─────────────────────────────────────────────────────────────
-- Les réglages de la signalétique
--
-- Jusqu'ici, le choix du modèle, de la couleur et du mot d'accueil vivait le
-- temps d'une visite : on rechargeait la page et tout était à refaire. Pour
-- une chose qu'on prépare en plusieurs fois — on essaie, on montre à sa mère,
-- on revient trois jours plus tard — c'était intenable.
--
-- Une seule colonne jsonb plutôt que huit colonnes. La raison n'est pas la
-- paresse : ces réglages sont de la mise en page, ils changeront à chaque
-- modèle ajouté, et faire une migration par nouveau bouton reviendrait à
-- faire migrer la base au rythme du graphisme. Rien ici n'est lu par une
-- politique de sécurité ni par une requête métier : c'est un état d'écran.
--
-- La photo, elle, est une vraie adresse de fichier sur R2. Elle n'entre pas
-- dans la table des photos : elle ne doit apparaître ni dans la galerie des
-- invités ni dans le diaporama.
-- ─────────────────────────────────────────────────────────────

alter table public.events
  add column if not exists signaletique jsonb not null default '{}'::jsonb;

comment on column public.events.signaletique is
  'Réglages d''impression de la signalétique : modèle, jeu de polices, jeu de couleurs, mot d''accueil, photo, affichage de la marque. État d''écran, jamais lu par une règle de sécurité.';
