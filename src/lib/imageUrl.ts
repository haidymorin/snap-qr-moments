/* Les images sont servies par le redimensionneur de Supabase.
 *
 * Pourquoi : une vignette fabriquée à l'envoi fait 400 px sur son plus grand
 * côté, donc 225 px sur le petit côté pour une photo de téléphone en portrait.
 * Affichée dans une case carrée de 328 px sur un écran Retina, il faut 656 px
 * réels : l'image est étirée presque trois fois et paraît floue.
 *
 * Le redimensionneur part de l'original et rend exactement la taille demandée.
 * Il corrige donc aussi les photos déjà déposées, sans rien régénérer.
 */

const OBJECT = "/storage/v1/object/public/";
const RENDER = "/storage/v1/render/image/public/";

const isTransformable = (url: string) => url.includes(OBJECT) && !/\.(mp4|mov|webm|m4v)(\?|$)/i.test(url);

/** Vignette carrée, recadrée, pour les grilles. `size` en pixels réels. */
export const gridUrl = (url: string | null | undefined, size = 700): string | undefined => {
  if (!url) return undefined;
  if (!isTransformable(url)) return url;
  return `${url.replace(OBJECT, RENDER)}?width=${size}&height=${size}&resize=cover&quality=78`;
};

/** Image entière pour la visionneuse : nette sans faire télécharger l'original. */
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
