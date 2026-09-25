/* Le mariage livré en juin 2026, avec l'accord des mariés. Elles ne sont plus
   présentées à part sous une légende : la légende laissait entendre que les
   autres photos du site étaient fausses. Elles se fondent dans le mur de la
   page d'accueil. Recadrées en carré, 900 px, ~120 Ko chacune. */
import danse from "@/assets/mariage/01-premiere-danse.jpg";
import signature from "@/assets/mariage/02-signature.jpg";
import sortie from "@/assets/mariage/03-sortie-mairie.jpg";
import voiture from "@/assets/mariage/04-mairie-voiture.jpg";

export const MARIAGE_REEL = [
  { src: sortie, alt: "mariageAltSortie" },
  { src: danse, alt: "mariageAltDanse" },
  { src: signature, alt: "mariageAltSignature" },
  { src: voiture, alt: "mariageAltVoiture" },
];

/* La banque d'images du site, hébergée par nous.
 *
 * Les vignettes venaient du CDN de Pexels : quand une image ne répondait pas,
 * sa case restait vide sur la page d'accueil. Les cinquante photos sont
 * désormais dans `public/photos`, recadrées en carré de 700 px (~60 Ko), et
 * plus rien ne dépend d'un service extérieur.
 *
 * Ce sont des photos libres de droits (Pexels et Unsplash, usage commercial
 * autorisé), choisies dans la banque d'images du projet : des gens, pas des
 * décors. Pour en ajouter une, la déposer dans `public/photos` sous le nom
 * suivant et incrémenter NOMBRE_PHOTOS. */

export const NOMBRE_PHOTOS = 50;

const nom = (n: number) => `/photos/photo-${String(n).padStart(2, "0")}.jpg`;

/** Une photo par index, en boucle sur la banque. Le paramètre de taille est
    conservé pour ne rien casser côté appelants : les fichiers sont déjà
    servis à la bonne taille. */
export const photo = (i: number, _size = 420) =>
  nom((((i % NOMBRE_PHOTOS) + NOMBRE_PHOTOS) % NOMBRE_PHOTOS) + 1);

/** Utilisée là où un identifiant précis était demandé. */
export const photoUrl = (id: number, _size = 420) => photo(id);

/* L'exemple de la recherche par visage.
 *
 * La démonstration ne tient que si tout vient d'une seule soirée : vingt-deux
 * photos d'un même mariage (libres de droits, usage commercial autorisé), la
 * mariée reconnaissable sur dix d'entre elles, et un selfie qui est le gros
 * plan de son visage recadré dans la cinquième. Avant, la galerie mélangeait
 * cinquante mariages différents : la reconnaissance ne voulait rien dire. */

export const NOMBRE_MARIAGE = 22;

const nomMariage = (n: number) => `/photos/mariage-${String(n).padStart(2, "0")}.jpg`;

/** Les vingt-deux photos du mariage de la démonstration, dans l'ordre. */
export const MARIAGE_DEMO = Array.from({ length: NOMBRE_MARIAGE }, (_, i) =>
  nomMariage(i + 1),
);

/** Les index (dans MARIAGE_DEMO) des photos où la mariée est reconnaissable. */
export const PHOTOS_ELLE = [0, 1, 6, 8, 9, 10, 13, 15, 16, 17];

export const SELFIE_EXEMPLE = "/photos/selfie-exemple.jpg";

/** La même, prête à poser en fond de bloc. */
export const photoBg = (i: number, size = 420) =>
  `center / cover no-repeat url("${photo(i, size)}")`;
