# Reconnaissance faciale — conception

*1er septembre 2026. À relire et valider avant toute ligne de code.*

## Ce qu'on construit, en une phrase

Un invité se prend en photo et reçoit les photos du mariage où il apparaît ; les
mariés peuvent faire de même pour les invités qui les y ont autorisés.

## Ce qu'on ne construit pas

Pas de recherche en direct pendant la soirée. Pas d'indexation des invités qui
n'ont rien demandé. Pas de reconnaissance sur les mineurs. Pas de conservation
des selfies. Ces quatre exclusions ne sont pas des simplifications de départ :
ce sont des décisions.

---

## 1. Les décisions et leurs raisons

| Décision | Raison |
|---|---|
| **Rien n'est analysé tant que personne ne demande** | Minimisation. Sur 250 invités dont trois cherchent leurs photos, on ne traite de la biométrie que pour ces trois-là. L'économie vient en prime. |
| **Le selfie vaut consentement** | Le geste produit et le consentement sont le même mouvement. Un invité qui ne fait rien n'est jamais indexé. |
| **Une seconde case, facultative, pour les mariés** | Deux finalités distinctes appellent deux consentements. Sans elle, les mariés ne peuvent chercher personne — indexer les visages d'invités qui n'ont rien demandé est précisément ce que l'article 9 interdit. |
| **Le selfie n'est jamais conservé** | On en extrait une empreinte, on jette l'image. Rien à voler, rien à fuiter. |
| **Réservé aux majeurs** | Un mariage est plein d'enfants et un mineur ne peut pas consentir valablement à un traitement biométrique. |
| **Rekognition en région Irlande** | Le service n'existe pas à Paris. Irlande, Francfort, Londres, Madrid : ce sera Dublin, `eu-west-1`. Un seul réglage, identique dans la console, le code et la politique de confidentialité. |
| **Deux durées de conservation** | Les photos vivent six mois ; les empreintes, non. Voir §5. |

---

## 2. Le parcours de l'invité

1. Il ouvre la galerie par le QR code. Un bandeau propose : « Retrouvez vos photos ».
2. L'écran de consentement explique en trois phrases ce qui va se passer, ce qui
   est conservé et combien de temps. Il rappelle qu'on peut **parcourir toute la
   galerie sans reconnaissance** — l'alternative doit être offerte sans pénalité
   ni incitation contraire.
3. Il donne un prénom. Il coche la case nécessaire. Il peut cocher la case
   facultative pour les mariés. Les deux cases sont décochées par défaut : une
   case pré-cochée n'est pas un consentement.
4. Il se prend en photo, ou choisit une image existante.
5. Il obtient ses photos, avec un bouton de téléchargement groupé.
6. **« Supprimer mon empreinte »** reste visible en permanence sur la galerie,
   pas enterré dans une page de confidentialité.

### Le parcours des mariés

Dans leur tableau de bord, une liste de prénoms : ceux qui ont coché la case
facultative. Un clic sur « Camille » affiche ses photos, pour composer l'album.

Les mariés ne voient jamais les selfies. Les invités qui n'ont pas accepté
n'apparaissent pas du tout — l'absence de consentement est invisible plutôt que
gênante.

---

## 3. Les trois états d'un événement

```
  aucun  ──(première demande)──►  en_cours  ──(fin de l'analyse)──►  actif
```

- **aucun** — aucune collection, rien d'analysé, rien de facturé. C'est l'état de
  tous les événements vendus en Essentiel, qui n'ont pas le tri par visage.
- **en_cours** — la collection vient d'être créée, les photos déjà déposées sont
  en cours d'analyse. La personne attend une à deux minutes, **une seule fois**.
- **actif** — chaque nouvelle photo est analysée à son arrivée. C'est ce qui fait
  qu'une photo déposée le jeudi apparaît dans une recherche faite le vendredi.

Un événement ne redescend jamais d'état.

---

## 4. Les données

### `face_events` — l'état d'indexation

| colonne | rôle |
|---|---|
| `event_id` | clé primaire, référence `events` |
| `status` | `aucun` / `en_cours` / `actif` |
| `collection_id` | identifiant de la collection Rekognition |
| `indexed_photos` | combien de photos analysées, pour l'affichage de progression |
| `activated_at` | quand la première demande a eu lieu |

### `face_consents` — qui a consenti à quoi

| colonne | rôle |
|---|---|
| `id` | clé primaire |
| `event_id` | référence `events` |
| `browser_token` | identifiant aléatoire déposé dans le navigateur de l'invité, pour qu'il revienne sans créer de compte |
| `first_name` | le prénom donné, seule chose que voient les mariés |
| `allow_hosts` | la case facultative |
| `rekognition_face_id` | l'empreinte dans la collection |
| `created_at`, `last_used_at`, `expires_at` | cycle de vie, voir §5 |

### `photo_faces` — quels visages sur quelles photos

| colonne | rôle |
|---|---|
| `photo_id`, `event_id` | références |
| `rekognition_face_id` | l'empreinte du visage détecté |

**Aucune de ces tables n'est lisible directement par le navigateur.** Comme pour
les photos aujourd'hui, tout passe par des fonctions `SECURITY DEFINER` :
publiques, mais limitées à un seul événement.

---

## 5. Le cycle de vie des données

| Donnée | Durée | Pourquoi |
|---|---|---|
| Le selfie | **jamais stocké** | On en extrait une empreinte, on jette l'image. |
| Empreinte d'un invité qui a seulement cherché ses photos | **90 jours** sans usage | Aucune raison de garder de la biométrie plus longtemps. S'il revient, il refait un selfie : trois secondes. |
| Empreinte d'un invité ayant coché la case « mariés » | **jusqu'à la fin de l'hébergement** | C'est la finalité qu'il a acceptée, et on le lui dit à ce moment-là. |
| Empreintes des visages détectés sur les photos | fin de l'hébergement | Elles disparaissent avec la collection. |
| La collection Rekognition entière | fin de l'hébergement | `DeleteCollection` : un seul appel, suppression propre. |

Une tâche planifiée passe chaque nuit supprimer ce qui a expiré. **Elle doit être
testée avant la mise en production** : une purge qui ne tourne pas est une
promesse non tenue, et celle-ci est écrite dans les conditions de vente.

---

## 6. Les fonctions serveur

Toutes sur le modèle de `create-checkout-session`, qui fonctionne déjà.

**`face-search`** — reçoit le selfie et les consentements. Crée la collection si
elle n'existe pas, lance l'analyse rétroactive, indexe le selfie, cherche, renvoie
les identifiants des photos correspondantes. Jette le selfie. C'est la seule
fonction qui peut être lente, et seulement à son premier appel pour un événement.

*(Une quatrième fonction était prévue pour analyser les photos arrivant après
coup. Elle s'est révélée inutile : `face-search` regarde toujours s'il reste des
photos non analysées, y compris quand l'événement est déjà actif. Une photo
déposée jeudi est donc retrouvée par une recherche faite vendredi, sans
déclencheur supplémentaire à maintenir.)*

**`face-forget`** — supprime l'empreinte d'un invité de la collection et sa ligne
de consentement. Appelable par l'invité depuis son navigateur, sans compte.

**`face-cleanup`** — la purge nocturne.

La clé AWS vit dans les secrets Lovable, `AWS_ACCESS_KEY_ID` et
`AWS_SECRET_ACCESS_KEY`. **Le navigateur ne parle jamais à Amazon.**

---

## 7. Ce qui peut échouer, et ce qu'on affiche

| Cas | Ce que voit l'invité |
|---|---|
| Aucun visage sur le selfie | « Nous n'avons pas trouvé de visage sur cette photo. Réessayez avec une photo de face, bien éclairée. » |
| Plusieurs visages sur le selfie | « Il y a plusieurs personnes sur cette photo. Prenez-en une où vous êtes seul. » |
| Aucune correspondance | « Aucune photo trouvée pour l'instant. Vos amis n'ont peut-être pas encore déposé les leurs — revenez dans quelques jours. » Et non pas un message d'échec : l'absence de résultat est souvent normale. |
| Rekognition indisponible | « Le tri est momentanément indisponible. Vous pouvez parcourir toute la galerie en attendant. » L'alternative est toujours proposée. |
| Analyse en cours | Une progression honnête : « 340 photos sur 900 analysées. » |

---

## 8. Ce qu'il faut vérifier avant de dire que ça marche

Le test qui compte n'est pas technique : **est-ce que le tri retrouve la tante
sur les photos d'un vrai mariage ?** À éprouver sur les photos de juin, avec de
vrais visages, de vraies lumières de salle et de vrais flous de mouvement.

À vérifier aussi, dans l'ordre : qu'un événement sans demande ne crée jamais de
collection ; qu'une photo déposée après l'activation est bien retrouvée ;
qu'« oublier mon empreinte » la supprime réellement chez Amazon et pas seulement
dans notre base ; que la purge nocturne fait son travail ; et qu'un invité qui
refuse la reconnaissance peut faire tout le reste sans gêne.

---

## 9. Phase 2 — le selfie ne quitte plus le téléphone

Une fois ce socle en place, le calcul de l'empreinte du selfie passe dans le
navigateur : le téléphone télécharge les empreintes des photos, quelques
centaines de kilo-octets, et compare sur l'appareil. Le serveur continue
d'analyser les photos, mais **le visage de l'invité ne part jamais**.

C'est ce que recommande la CNIL — que le gabarit reste sous la maîtrise de la
personne — et c'est surtout une phrase que les concurrents ne peuvent pas dire :
*« votre selfie ne quitte jamais votre téléphone »*. Vraie, vérifiable, et
argument de vente autant que garantie.

Ce n'est pas dans le périmètre d'aujourd'hui, mais rien dans les choix ci-dessus
ne l'empêche.

---

## 10. Ce qui reste à la charge de Haïdy

- **L'AIPD.** Obligatoire avant tout traitement biométrique. Trame fournie, à
  relire et assumer : c'est elle la responsable de traitement.
- **Le compte AWS** et la clé d'accès à déposer dans les secrets Lovable.
- **Le test sur de vraies photos.**
- **La mise à jour de la politique de confidentialité et des conditions de
  vente**, que je rédige mais qu'elle valide.
