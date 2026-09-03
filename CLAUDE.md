# QR Memories

Collecte de photos d'événements par QR code. Les invités scannent, déposent leurs photos
sans installer d'application, le tri se fait automatiquement, et il en reste un objet
imprimé. Marché principal : le mariage. Projet mené par une fondatrice seule, non
développeuse.

> **Ce fichier est la mémoire du projet.** Il voyage avec le code : il suffit de cloner
> le dépôt sur n'importe quelle machine pour que Claude retrouve tout le contexte. Le
> détail de ce qui a été fait et pourquoi se lit dans `git log` — les messages de commit
> sont rédigés pour ça. **Tenir ce fichier à jour à chaque chantier terminé.**

## Stack

- Vite + React + TypeScript + Tailwind + shadcn/ui
- Supabase pour la base (projet géré par Lovable) · **Cloudflare R2 pour les fichiers**
- Stripe pour l'encaissement, Amazon Rekognition pour la reconnaissance faciale
- Ce dépôt est synchronisé avec Lovable : tout push sur GitHub est repris par Lovable,
  qui applique les migrations et redéploie. Ne jamais éditer le même fichier des deux
  côtés en même temps. **Une migration ne s'applique pas toute seule : il faut la
  demander à Lovable.**

## À ne jamais casser

- **Accès invité jamais par les tables.** Passer par les fonctions `guest_get_event`,
  `guest_list_media`, `guest_count_media`, `guest_list_by_ids`, `guest_reglages`,
  `guest_list_livre_dor` (SECURITY DEFINER). Règle : public, mais limité à un seul
  événement. Un scanner de sécurité signalera ce motif — c'est l'architecture, pas un
  défaut.
- **`public.user_roles` n'a aucune politique RLS, exprès.** C'est ce qui rend impossible
  de se nommer administrateur depuis un navigateur. Ne jamais « réparer » ce point.
- **Un événement naît du paiement**, jamais d'un `insert` dans le navigateur. Seule
  l'administratrice peut en créer à la main. Le webhook Stripe écrit avec la clé de
  service.
- **Le bucket R2 est sous juridiction européenne**, donc son adresse S3 contient `.eu` :
  `<compte>.eu.r2.cloudflarestorage.com`. Signer contre l'adresse sans `.eu` donne un
  403 sans en-tête CORS, ce qui ressemble côté invité à une coupure de connexion.
- **Le seau Supabase `event-photos` est fermé en écriture.** Il ne garde que les photos
  antérieures à la migration R2, en lecture seule. Ne pas y remettre de dépôt.
- **`.env` ne contient que des variables `VITE_`**, publiques par construction. Aucun
  secret : les clés vivent dans le formulaire de secrets de Lovable, jamais dans son
  chat.
- **Piège Tailwind** : tous les `borderRadius` sont forcés à `0` et les ombres à `none`
  dans `tailwind.config.ts`. Donc `rounded-2xl` et `shadow-card` dans le code ne rendent
  rien — ce ne sont pas des écarts de charte. Les vrais écarts sont `rounded-full`, les
  `linear-gradient(...)` en dur, et `text-white` / `bg-white`.

## Le public réel

- **95 % des invités arrivent sur mobile**, en soirée, en lumière basse, sur un réseau
  saturé par 120 personnes au même endroit, avec une main occupée par un verre. Le
  mobile n'est pas une adaptation du bureau : c'est le cas principal.
- Les mariés comparent les offres sur ordinateur, à froid, avant de payer.
- **Les photos arrivent le lendemain**, pas pendant la fête. Toute fonctionnalité qui
  suppose un flux en direct doit être pensée autrement.

## Les offres

| | France | Contenu |
|---|---|---|
| Essentiel / Essential | 59 € | QR, galerie, nettoyage automatique, signalétique |
| **Souvenir** | **179 €** | **+ livre d'or, tri par visage, diaporama — l'offre cible** |
| Héritage / Heritage | 390 € | + album grand format et gazette 50 ex. |

Six mois d'hébergement pour toutes. Les noms ne se traduisent pas au-delà de ça :
« Souvenir » est identique dans les deux langues et fait le pont.

## Direction artistique — « Écru & Prune fumée »

```
fond #F5F1EA · texte #3A2E32 · secondaire #6E6164 · filets #E2DAD3 · nuit #1B1917
```

**Cormorant Garamond 600** pour les titres · **Montserrat 400** pour le texte en 17 px ·
**JetBrains Mono** uniquement pour les chiffres et les étiquettes en capitales espacées.

*Un écrin clair et calme. La couleur vient des photos, pas de la marque.*

**Interdits absolus** : angles arrondis, dégradés, icônes dans des ronds de couleur,
ombres portées, blanc pur. Les séparations sont des filets de 1 px.

Chantier ouvert : le site manque de contraste — un seul plan, un fond unique, aucun
accent. Trois directions comparées (« Bandes », « Bleu de four », « Nuit »), décision
non prise. Éviter le terracotta, réflexe de tous les sites crème à titrage serif.

## RGPD

La reconnaissance faciale produit de la donnée biométrique (article 9). Consentement
explicite et individuel de **chaque personne**, mariés compris — pas d'interrupteur
d'hôte qui déciderait pour les invités. Le selfie n'est jamais conservé : empreinte
extraite, image jetée. Photos six mois, empreintes de visages quatre-vingt-dix jours.
AIPD rédigée, dans le projet Claude.

## Méthode de travail attendue

- **Vérifier soi-même avant de bâtir sur une observation rapportée.** Elle décrit ce
  qu'elle voit, pas ce que fait la machine. Une panne d'envoi a coûté trois tours parce
  que « la photo marche » avait été pris pour argent comptant, alors que le tableau de
  bord Cloudflare affichait zéro fichier depuis le début.
- `npx tsc --noEmit -p tsconfig.app.json` puis `npm run build` avant tout commit.
- Des commits petits, et des messages qui expliquent **pourquoi**, pas seulement quoi :
  ce sont eux qui servent de mémoire au projet.
- Contournement Git connu : `rm -f .git/index.lock .git/HEAD.lock` avant chaque commit,
  des verrous orphelins bloquent tout, y compris GitHub Desktop.
- La personne en face **n'est pas développeuse** : expliquer en français, traduire le
  jargon, et dire à chaque étape ce qu'elle doit aller vérifier de ses propres yeux, sur
  quelle page, avec quel appareil.
- Ne jamais lui faire dire, dans un texte client, un raisonnement interne. Elle a rejeté
  « nous préférons vous promettre six mois que nous tiendrons plutôt que trois ans dont
  personne ne peut répondre » : cela suggère que l'entreprise pourrait ne pas survivre.
- Ne jamais inventer de chiffre, de témoignage ou de logo client. Le site n'a pas encore
  de client payant ; tout chiffre affiché doit être réel ou ne pas exister.

## Où est le reste

Le projet Claude « QR EVENTS » porte la stratégie, les prix, le juridique et l'état
d'avancement : `feuille-de-route-septembre-2026.md` (ce qui est fait et ce qui manque),
`pricing.md`, `parcours-achat.md`, `livre-dor-et-diaporamas.md`,
`aipd-reconnaissance-faciale.md`, `juridique-et-encaissement.md`, `technique-site.md`.

@BRIEF-DESIGN.md
