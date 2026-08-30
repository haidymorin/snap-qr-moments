# Chantier design & optimisation — QR Memories

Refonte complète de l'interface, dans l'ordre ci-dessous. Le site existe déjà et
fonctionne : il ne s'agit pas de repartir de zéro, mais de le rendre net, honnête et
rapide.

---

## Étape 0 — Auditer avant de toucher quoi que ce soit

Avant la moindre modification, produire un état des lieux écrit :

1. La liste des routes et des composants de page, avec ce que chacun fait.
2. Le poids du bundle après `npm run build` (fichier par fichier), et les cinq
   dépendances les plus lourdes.
3. Tous les endroits où l'interface affiche un chiffre, un nom ou un témoignage : dire
   pour chacun s'il vient de la base ou s'il est écrit en dur dans le code.
4. Tous les écarts avec la direction artistique décrite dans `CLAUDE.md` — angles
   arrondis, dégradés, ombres, blanc pur, couleurs hors palette.
5. Les composants shadcn/ui importés mais jamais utilisés.

Présenter ce constat, puis proposer un plan de chantiers ordonné. **Attendre la
validation avant de coder.**

---

## Chantier 1 — La page d'accueil

C'est la page qui vend. Elle est vue à froid, sur ordinateur, par des mariés et des
wedding planners qui comparent trois prestataires.

### Ce qui doit disparaître

- **Le compteur du hero, « 73 photos déposées ».** Le nombre change à chaque
  rechargement : c'est un chiffre inventé. Sur un site qui n'a pas encore de client
  payant, c'est exactement le détail qui coûte la confiance d'un prescripteur qui
  regarde de près. Le retirer entièrement, sans le remplacer par un autre chiffre.
- **Les dégradés du mur de photos.** Les vignettes du hero sont des rectangles en
  dégradé gris et beige. Les dégradés sont un interdit de la charte, et surtout : un
  produit dont la promesse est *« vos invités font de belles photos »* ne peut pas
  montrer des cases vides. Soit de vraies photos de mariage libres de droits, soit un
  mur de cadres au filet de 1 px, assumé comme un schéma. Pas d'entre-deux.
- **Les angles arrondis** : bouton « Mon dashboard », bascule FR/EN, cartes de tarifs.
  Tout passe en angles vifs, séparations au filet de 1 px.

### Ce qui doit être vérifié

- Les trois paliers affichés doivent être **Essentiel 59 € · Souvenir 179 € ·
  Héritage 390 €**, avec le Souvenir marqué comme le plus choisi.
- La démonstration du tri par IA (« 247 photos → 34 photos de Camille ») est une
  illustration : elle doit être visiblement présentée comme un exemple, jamais comme
  un cas client réel.
- Le témoignage du livre d'or (« Jeanne, sa grand-mère ») est une mise en scène : même
  règle, il doit se lire comme un exemple.

### Ce qui doit être renforcé

- Une seule action principale par écran. Aujourd'hui le hero propose deux boutons de
  même poids visuel ; il en faut un dominant et un discret.
- Le parcours doit répondre dans cet ordre aux trois questions d'un couple : *qu'est-ce
  que je reçois à la fin ?*, *qu'est-ce que mes invités doivent faire ?*, *combien ?*

---

## Chantier 2 — La page album des invités

C'est la page qui décide si les photos arrivent. Elle est vue par 120 personnes par
mariage, sur téléphone, en trente secondes, après le scan d'un QR sur une table. C'est
aussi la seule page que voient les invités : c'est la vitrine du produit auprès de
futurs mariés.

### Les défauts constatés

- **Les erreurs ne disent rien.** Un bandeau rouge « Envoi impossible — 16 fichiers
  n'ont pas pu être envoyés » recouvre le titre de l'album et ne donne ni la raison, ni
  quel fichier, ni quoi faire. Il faut : un état par fichier, la raison en français
  clair (« trop lourde », « format non reconnu », « connexion perdue »), et un bouton
  « réessayer » qui ne renvoie que ce qui a échoué.
- **Aucun retour pendant l'envoi.** Sur un réseau de salle des fêtes, seize photos
  prennent une minute ou plus. Sans progression visible, l'invité croit que c'est cassé
  et abandonne. Il faut une progression par fichier et un total.
- **Pas de bouton appareil photo.** Le seul bouton ouvre la pellicule. Il en faut deux :
  *prendre une photo maintenant* (`capture="environment"`) et *choisir dans mes photos*.
  Le premier est celui qui crée des photos pendant la fête.
- **L'état vide s'excuse.** « Soyez le premier à partager un souvenir ! » avec un point
  d'exclamation, dans une carte aux angles arrondis. À reprendre : une phrase calme,
  sans exclamation, et une invitation à l'action.
- Les onglets Tout / Photos / Vidéos sont dans une pilule arrondie grise, hors charte.

### Les contraintes techniques

- Redimensionner les images **dans le navigateur avant l'envoi** (2500 px de côté long,
  qualité 0,85). Cela divise par trois ou quatre le temps d'envoi sur un réseau saturé,
  et le coût de stockage. C'est l'optimisation la plus rentable de tout le projet.
- Envoyer en file, trois fichiers en parallèle au maximum, avec reprise sur échec — pas
  seize requêtes simultanées.
- Le nom de fichier envoyé au stockage ne doit jamais contenir le nom d'origine tel
  quel (accents, espaces, doublons). Chemin attendu : `<event_id>/<uuid>.<ext>`.
- Vérifier le comportement réel avec des fichiers HEIC d'iPhone et une vidéo de plus de
  50 Mo : afficher le refus avant l'envoi, pas après.

---

## Chantier 3 — Le tableau de bord des hôtes

Vu une poignée de fois, sur ordinateur, par un couple stressé. Il doit répondre à trois
questions sans faire défiler : *combien de photos sont arrivées*, *à quoi ressemble mon
QR et comment je l'imprime*, *quand est-ce que ça expire*.

- Le QR et le PDF de signalétique doivent être trouvables en un geste depuis l'accueil
  du tableau de bord : c'est le kit qui fait monter les photos.
- Les chiffres affichés ici sont réels : ils viennent de `guest_count_media`.

---

## Chantier 4 — Le poids et la vitesse

Le bundle JavaScript fait environ **840 Ko en un seul fichier**. Sur le réseau d'une
salle de réception, c'est plusieurs secondes avant le premier pixel utile, pour chacun
des 120 invités.

- Découper par route (`React.lazy` sur les pages), sortir le tableau de bord et les
  pages marketing du chemin critique de la page de dépôt.
- Retirer les composants shadcn/ui jamais utilisés et les dépendances mortes.
- Charger les polices en `font-display: swap`, ne charger que les graisses réellement
  utilisées (Cormorant 600, Montserrat 400, JetBrains Mono 400).
- Vignettes en `loading="lazy"`, dimensions déclarées, format moderne.
- Objectif à annoncer et à mesurer : **page de dépôt utilisable en moins de 2 secondes
  sur une connexion mobile lente simulée.** Donner le chiffre avant et après.

---

## Accessibilité et lisibilité

- Contraste vérifié sur le fond écru : le texte secondaire `#6E6164` sur `#F5F1EA` doit
  être contrôlé et corrigé s'il passe sous 4,5:1.
- Zones tactiles d'au moins 44 px : les invités visent mal, debout, dans le noir.
- Le site est bilingue FR/EN — vérifier qu'aucune chaîne ajoutée ne reste en dur dans
  une seule langue.

---

## Ce qu'on ne fait pas

- Pas de refonte de l'identité : la charte est arrêtée, on l'applique.
- Pas de nouvelle fonctionnalité tant que les quatre chantiers ci-dessus ne sont pas
  livrés. L'application sur l'écran d'accueil (PWA) et le bouton appareil photo avancé
  viendront après, dans un chantier séparé.
- Pas de faux contenu : ni chiffre, ni témoignage, ni logo client inventés.
- Pas de modification du schéma de base ni des politiques RLS.
