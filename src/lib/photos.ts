/* Photos de mariage libres de droits (Pexels — licence gratuite, usage
   commercial autorisé, sans attribution obligatoire). Servies par le CDN de
   Pexels, recadrées en carré : une vingtaine de Ko par vignette.
   Pour les héberger nous-mêmes plus tard, il suffira de changer photoUrl.

   Charte : un produit qui promet de belles photos ne montre jamais un
   dégradé à la place d'une photo. Tout aplat décoratif passe par ici. */

export const PHOTO_IDS = [
  36028957, 10622328, 12919433, 19691776,
  6918173, 2765703, 8210489, 1128784,
  28123410, 15964962, 10360902, 15964954,
  26558729, 30505255, 10360901, 17111049,
];

export const photoUrl = (id: number, size = 420) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${size}&h=${size}&fit=crop`;

/** Une photo par index, en boucle sur la liste. */
export const photo = (i: number, size = 420) =>
  photoUrl(PHOTO_IDS[((i % PHOTO_IDS.length) + PHOTO_IDS.length) % PHOTO_IDS.length], size);

/** La même, prête à poser en fond de bloc. */
export const photoBg = (i: number, size = 420) =>
  `center / cover no-repeat url("${photo(i, size)}")`;
