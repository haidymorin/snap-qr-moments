/* Deux mesures calculées sur le téléphone de l'invité, au moment du dépôt.
 *
 * Le tri est vendu sur les trois formules, y compris dans les conditions de
 * vente. Il devait donc exister pour de bon, et sans coûter un centime : tout
 * se fait ici, dans le navigateur, sur une vignette de quelques milliers de
 * pixels. Quelques millisecondes par photo, aucun serveur, aucun transfert.
 *
 *   1. Une empreinte perceptuelle (dHash) — deux photos d'une même rafale
 *      donnent des empreintes presque identiques. La comparaison se fait
 *      ensuite en base, où l'on connaît toutes les autres photos de la soirée.
 *
 *   2. Une mesure de netteté (variance du laplacien) — une image nette a des
 *      contours francs, donc un laplacien qui varie beaucoup. Une image floue
 *      n'a presque pas de contours.
 *
 * Rien n'est jamais supprimé sur la foi de ces deux nombres. Ils décident de
 * ce qui s'affiche en premier, jamais de ce qui existe : une photo floue peut
 * être la seule où figure la grand-mère.
 */

/** Côté de la vignette servant à l'empreinte : 9 × 8 donne 64 comparaisons. */
const EMPREINTE_L = 9;
const EMPREINTE_H = 8;

/** Côté de l'extrait carré servant à mesurer la netteté. */
const NETTETE_COTE = 320;

/* Seuils volontairement prudents. Se tromper en écartant une bonne photo coûte
   beaucoup plus cher que de laisser passer une mauvaise : le premier cas, la
   personne ne retrouve pas son souvenir et n'a aucun moyen de le savoir. */

/** En dessous, l'image est considérée floue. */
export const SEUIL_FLOU = 55;

/* Une photo très sombre ou très uniforme — une piste de danse, un ciel de nuit
   — a peu de contours sans être floue pour autant. En dessous de ce contraste,
   on refuse de juger et la photo reste. */
const CONTRASTE_MINIMUM = 12;

export interface MesuresPhoto {
  /** 16 caractères hexadécimaux, ou null si l'image n'a pas pu être lue. */
  empreinte: string | null;
  /** Variance du laplacien, ou null si l'image est trop plate pour être jugée. */
  nettete: number | null;
}

async function decoder(source: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    return await createImageBitmap(source);
  }
  const url = URL.createObjectURL(source);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("image_illisible"));
      img.src = url;
    });
  } finally {
    /* Révoqué au tour suivant : l'image est déjà décodée à ce moment-là. */
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

function contexte(l: number, h: number): CanvasRenderingContext2D | null {
  const c = document.createElement("canvas");
  c.width = l;
  c.height = h;
  return c.getContext("2d", { willReadFrequently: true });
}

const gris = (d: Uint8ClampedArray, i: number) =>
  0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

/** L'empreinte : chaque pixel est comparé à son voisin de droite. */
function empreinteDe(src: CanvasImageSource, l: number, h: number): string | null {
  const ctx = contexte(EMPREINTE_L, EMPREINTE_H);
  if (!ctx) return null;
  ctx.drawImage(src, 0, 0, l, h, 0, 0, EMPREINTE_L, EMPREINTE_H);
  const { data } = ctx.getImageData(0, 0, EMPREINTE_L, EMPREINTE_H);

  const bits: number[] = [];
  for (let y = 0; y < EMPREINTE_H; y++) {
    for (let x = 0; x < EMPREINTE_L - 1; x++) {
      const a = gris(data, (y * EMPREINTE_L + x) * 4);
      const b = gris(data, (y * EMPREINTE_L + x + 1) * 4);
      bits.push(a > b ? 1 : 0);
    }
  }

  let hex = "";
  for (let i = 0; i < 64; i += 4) {
    hex += ((bits[i] << 3) | (bits[i + 1] << 2) | (bits[i + 2] << 1) | bits[i + 3]).toString(16);
  }
  return hex;
}

/** La netteté, mesurée sur le centre de l'image — là où se trouve le sujet. */
function netteteDe(src: CanvasImageSource, l: number, h: number): number | null {
  const ctx = contexte(NETTETE_COTE, NETTETE_COTE);
  if (!ctx) return null;

  /* On prend un carré au centre, à l'échelle 1:1 autant que possible :
     réduire une photo floue la fait paraître nette, et fausserait la mesure. */
  const cote = Math.min(l, h, NETTETE_COTE);
  ctx.drawImage(src, (l - cote) / 2, (h - cote) / 2, cote, cote, 0, 0, NETTETE_COTE, NETTETE_COTE);
  const { data } = ctx.getImageData(0, 0, NETTETE_COTE, NETTETE_COTE);

  const g = new Float32Array(NETTETE_COTE * NETTETE_COTE);
  let somme = 0;
  for (let i = 0; i < g.length; i++) {
    g[i] = gris(data, i * 4);
    somme += g[i];
  }

  /* Le contraste général : s'il est très faible, l'image est sombre ou plate,
     pas nécessairement floue. On s'abstient plutôt que de se tromper. */
  const moyenne = somme / g.length;
  let ecarts = 0;
  for (let i = 0; i < g.length; i++) ecarts += (g[i] - moyenne) ** 2;
  if (Math.sqrt(ecarts / g.length) < CONTRASTE_MINIMUM) return null;

  /* Laplacien 3 × 3, puis variance de son résultat. */
  let sommeL = 0;
  let sommeL2 = 0;
  let n = 0;
  for (let y = 1; y < NETTETE_COTE - 1; y++) {
    for (let x = 1; x < NETTETE_COTE - 1; x++) {
      const i = y * NETTETE_COTE + x;
      const v =
        -4 * g[i] + g[i - 1] + g[i + 1] + g[i - NETTETE_COTE] + g[i + NETTETE_COTE];
      sommeL += v;
      sommeL2 += v * v;
      n++;
    }
  }
  const moyenneL = sommeL / n;
  return sommeL2 / n - moyenneL * moyenneL;
}

/**
 * Mesure une photo. Ne lève jamais : un échec rend des mesures nulles, et la
 * photo est alors conservée sans jugement — c'est le comportement voulu.
 */
export async function mesurerPhoto(source: Blob): Promise<MesuresPhoto> {
  try {
    const img = await decoder(source);
    const l = "width" in img ? img.width : 0;
    const h = "height" in img ? img.height : 0;
    if (!l || !h) return { empreinte: null, nettete: null };

    try {
      return {
        empreinte: empreinteDe(img as CanvasImageSource, l, h),
        nettete: netteteDe(img as CanvasImageSource, l, h),
      };
    } finally {
      if ("close" in img && typeof img.close === "function") img.close();
    }
  } catch {
    return { empreinte: null, nettete: null };
  }
}
