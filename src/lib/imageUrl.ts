/* Les adresses d'images.
 *
 * Deux stockages coexistent, et c'est voulu : les fichiers déposés depuis la
 * bascule vivent sur Cloudflare R2, ceux d'avant sont restés chez Supabase.
 * Ces fonctions traitent les deux sans que le reste du code ait à savoir
 * lequel il manipule.
 *
 * Sur Supabase, un redimensionneur fabriquait la taille demandée à la volée.
 * R2 sert des fichiers, pas des transformations : on s'appuie donc sur les
 * deux tailles produites dans le navigateur avant l'envoi — une image de
 * 2560 px et une vignette de 800 px. La vignette est assez grande pour rester
 * nette dans une grille sur écran Retina, ce qui était la raison d'être du
 * redimensionneur.
 */

const OBJECT = "/storage/v1/object/public/";
const RENDER = "/storage/v1/render/image/public/";

const isTransformable = (url: string) => url.includes(OBJECT) && !/\.(mp4|mov|webm|m4v)(\?|$)/i.test(url);

/**
 * L'adresse à utiliser dans une grille.
 *
 * On lui passe la vignette quand elle existe : sur R2 c'est elle qui évite de
 * faire télécharger une image de 2560 px pour l'afficher dans une case de
 * 300 px — sur le réseau d'une salle de réception, avec quatre-vingts
 * vignettes à l'écran, la différence n'est pas cosmétique.
 */
export const gridUrl = (url: string | null | undefined, size = 700): string | undefined => {
  if (!url) return undefined;
  if (!isTransformable(url)) return url;
  return `${url.replace(OBJECT, RENDER)}?width=${size}&height=${size}&resize=cover&quality=78`;
};

/** Image entière pour la visionneuse. Sur R2, c'est le fichier de 2560 px. */
export const viewUrl = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined;
  if (!isTransformable(url)) return url;
  return `${url.replace(OBJECT, RENDER)}?width=2000&quality=88`;
};

/** Si le redimensionneur ne répond pas, on retombe sur le fichier d'origine. */
export const fallbackToOriginal = (
  e: React.SyntheticEvent<HTMLImageElement>,
  original: string | null | undefined
) => {
  const img = e.currentTarget;
  if (original && img.src !== original) img.src = original;
};
