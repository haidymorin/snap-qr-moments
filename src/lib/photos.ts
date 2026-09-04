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

/* Photos de mariage libres de droits (Pexels — licence gratuite, usage
   commercial autorisé, sans attribution obligatoire). Servies par le CDN de
   Pexels, recadrées en carré : une vingtaine de Ko par vignette.
   Pour les héberger nous-mêmes plus tard, il suffira de changer photoUrl.

   Charte : un produit qui promet de belles photos ne montre jamais un
   dégradé à la place d'une photo. Tout aplat décoratif passe par ici. */

/* La banque d'images du site.
 *
 * L'ancienne série montrait surtout des tables dressées, des fleurs et des
 * décors : joli, et à côté du sujet. Ce que le produit collecte, ce sont des
 * gens — des invités qui se prennent en photo, qui dansent, qui lèvent leur
 * verre. Une page qui ne montre que du décor ne ressemble pas à ce qu'on
 * reçoit le lendemain d'un mariage.
 *
 * Ces vingt-cinq photos viennent d'un seul et même mariage, comme un vrai
 * album, et chacune a été regardée avant d'être retenue. */
export const PHOTO_IDS = [
  13434416, 13434419, 13434413, 13434420, 13434422,
  13434417, 13434423, 13434424, 13434426, 13434421,
  13434429, 13434430, 13434433, 13434434, 13434425,
  13434436, 13434437, 13434438, 13434427, 13434439,
  13434440, 13434431, 13434443, 13434444, 11988908,
];


export const photoUrl = (id: number, size = 420) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${size}&h=${size}&fit=crop`;

/** Une photo par index, en boucle sur la liste. */
export const photo = (i: number, size = 420) =>
  photoUrl(PHOTO_IDS[((i % PHOTO_IDS.length) + PHOTO_IDS.length) % PHOTO_IDS.length], size);

/** La même, prête à poser en fond de bloc. */
export const photoBg = (i: number, size = 420) =>
  `center / cover no-repeat url("${photo(i, size)}")`;
