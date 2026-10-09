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
| Essentiel / Essential | 59 € | QR, galerie, tri automatique, signalétique, lien de la galerie envoyé aux invités |
| **Souvenir** | **179 €** | **+ livre d'or (écrit, vocal, vidéo), tri par visage, diaporama, jeu photo — l'offre cible** |
| Héritage / Heritage | 259 € | + album grand format 28×28 et outil de composition (validation → export pour l'imprimeur) |

Le contenu exact vendu vit dans `src/data/formules.ts` : c'est lui qui fait foi, pas ce
tableau. Six mois d'hébergement pour toutes. Les noms ne se traduisent pas au-delà de
ça : « Souvenir » est identique dans les deux langues et fait le pont.

**Audit du 8 octobre 2026** (migration `20261008100000_promesses_des_formules.sql`) :
chaque ligne des formules relue contre le code. Ajoutés : la vidéo dans le livre d'or ;
le lien de la galerie envoyé à chaque invité qui a laissé son adresse, même sans mot des
mariés (fonction `mot-de-merci`, horaire) ; la validation de l'album, l'alerte e-mail à
l'administratrice et le téléchargement numéroté pour l'impression. Corrigé : l'import
de photos personnelles dans l'album (chemin refusé par `r2-sign-upload`) et la fiche de
l'album, qui promettait un 30×30 toilé à plat alors que Gelato livre un 28×28 rigide mat
à reliure collée.

**Commandes après l'achat** (migration `20261008160000_commandes_a_la_carte.sql`) :
album 129 €, mini-album 45 €, année en ligne 29 € et passage à une formule supérieure
(on paie la différence) se commandent depuis l'espace des mariés (`CarteCommandes`).
`create-checkout-session` fixe les prix, `stripe-webhook` écrit la table `commandes` et
applique l'effet une seule fois (`applique_le`). L'administratrice suit les commandes
dans `/admin` (`CommandesAdmin`) et reçoit un e-mail à chacune.

## Direction artistique : « Signal » (depuis le 4 septembre 2026)

**Le site en ligne fait foi.** L'ancienne charte « Écru & Prune fumée » (serif sur écru,
angles à zéro) a été abandonnée le 4 septembre (commit `3104148`) : elle donnait l'air
d'un vieux journal.

```
fond #FFFFFF · encre #111014 · aubergine #40203B (action) · cuivre #C1793E (étiquettes)
prune #7E4479 (halos) · gris #69606C · filets #EAE6EA · surface #F8F7F8
```

**Bricolage Grotesque 700** pour les titres (interlettrage serré) · **Instrument Sans**
pour le texte · **JetBrains Mono** pour les étiquettes en capitales espacées, en cuivre.
Angles arrondis de 6 à 28 px selon l'échelle, boutons en pilule. Fond blanc, beaucoup de
contraste ; la couleur vient des photos.

**Trois niveaux de boutons** (9 octobre 2026, classes dans `src/index.css`) :
`.btn-action` aubergine plein pour l'action finale d'un bloc, avec une pastille cuivre et
sa flèche quand c'est un envoi ; `.btn-cuivre` (variante `cuivre` du composant `Button`)
pour les gestes secondaires : télécharger, choisir dans ses photos, sélectionner,
réessayer ; `.tuile` pour choisir entre plusieurs façons de faire (écrire, voix, vidéo).
Haïdy trouvait les contours gris « fades » : rien n'appelait le doigt.

Les e-mails suivent la même direction : gabarit commun dans
`supabase/functions/_shared/gabarit-email.ts`.

**Rédaction : pas de tiret long (—) dans les textes destinés aux clients.** Haïdy trouve
que ça fait écrit par une IA. Deux-points, virgules ou phrases séparées.

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
