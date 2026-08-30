# QR Memories

Collecte de photos d'événements par QR code. Les invités scannent, déposent leurs photos
sans installer d'application, le tri se fait automatiquement, et il en reste un objet
imprimé. Marché principal : le mariage. Projet mené par une fondatrice seule, non
développeuse.

## Stack

- Vite + React + TypeScript + Tailwind + shadcn/ui
- Supabase pour la base et le stockage (projet géré par Lovable)
- Ce dépôt est synchronisé avec Lovable : tout push sur GitHub est repris par Lovable.
  Ne jamais éditer le même fichier des deux côtés en même temps.

## À ne jamais casser

- **Accès invité jamais par les tables.** Passer par les fonctions `guest_get_event`,
  `guest_list_media`, `guest_count_media` (SECURITY DEFINER). Règle : public, mais
  limité à un seul événement.
- **Politiques RLS de dépôt.** `guests_upload`, `guests_read` sur `storage.objects`,
  `guests_add_photo` sur `public.photos`, et la fonction `event_exists`. Elles viennent
  d'être réparées après une panne totale du dépôt de photos. Ne pas y toucher.
- **Bucket de stockage** : `event-photos`, plafond 50 Mo par fichier, tous formats admis.
- **Colonnes existantes**, à ne pas renommer :
  `events(id, name, event_date, user_id)`
  `photos(id, event_id, storage_path, url, media_type, file_name, thumbnail_url)`
- **`.env` reste dans `.gitignore`.** Aucune clé en clair dans un fichier committé.

## Le public réel

- **95 % des invités arrivent sur mobile**, en soirée, en lumière basse, sur un réseau
  saturé par 120 personnes au même endroit, avec une main occupée par un verre. Le
  mobile n'est pas une adaptation du bureau : c'est le cas principal, et le desktop est
  la variante.
- Les mariés, eux, comparent les offres sur ordinateur, à froid, avant de payer.
- Chaque seconde de chargement sur la page de dépôt coûte des photos. C'est mesurable
  et c'est le cœur du produit.

## Direction artistique — « Écru & Prune fumée »

Couleurs, et rien d'autre :

```
fond #F5F1EA · texte #3A2E32 · secondaire #6E6164 · filets #E2DAD3
```

Typographie : **Cormorant Garamond 600** pour les titres · **Montserrat 400** pour le
texte courant en 17 px · **JetBrains Mono** uniquement pour les chiffres et les
étiquettes en capitales espacées.

Principe directeur : *un écrin clair et calme. La couleur vient des photos, pas de la
marque.*

**Interdits absolus** : angles arrondis, dégradés, icônes dans des ronds de couleur,
ombres portées, blanc pur. Les séparations sont des filets de 1 px.

## Méthode de travail attendue

- **Auditer et proposer avant d'écrire.** Montrer le plan et attendre la validation
  avant de modifier des fichiers.
- Une branche par chantier, des commits petits et lisibles.
- `npm run build` doit passer avant tout commit.
- La personne en face **n'est pas développeuse** : expliquer en français, traduire le
  jargon, et dire à chaque étape ce qu'elle doit aller vérifier de ses propres yeux,
  sur quelle page, avec quel appareil.
- Ne jamais inventer de chiffre, de témoignage, de logo client ou de statistique dans
  l'interface. Le site n'a pas encore de client payant ; tout chiffre affiché doit être
  réel ou ne pas exister.

@BRIEF-DESIGN.md
