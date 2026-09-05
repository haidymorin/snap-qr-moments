/* Le contraste des couleurs, pour la signalétique imprimée.
 *
 * Une cliente choisit « vieux rose » parce que c'est la couleur de son
 * mariage, et le titre devient illisible à deux mètres. Pire : si on laissait
 * teinter le QR code lui-même, il ne se scannerait plus du tout — un lecteur
 * cherche un écart franc entre les modules sombres et le fond clair, et du
 * cuivre pâle sur ivoire n'en offre aucun.
 *
 * D'où deux règles appliquées par le générateur, et non par la bonne volonté
 * de la personne : le QR reste toujours posé sur un carré blanc, quelle que
 * soit la couleur choisie ; et un texte dont le contraste est insuffisant
 * déclenche une alerte, avec la variante assombrie proposée à côté.
 *
 * Le calcul est celui du WCAG. Il vaut pour un écran, et l'impression est
 * plutôt moins favorable — l'encre bave, le papier n'est pas blanc, la salle
 * est en lumière tamisée. On garde donc les seuils tels quels sans les
 * arrondir vers le bas.
 */

export const versRVB = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "").trim();
  const plein = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(plein.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const enHex = (r: number, v: number, b: number) =>
  "#" + [r, v, b].map((x) => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, "0")).join("");

/** La luminance relative au sens du WCAG. */
export const luminance = (hex: string): number => {
  const canal = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [r, v, b] = versRVB(hex);
  return 0.2126 * canal(r) + 0.7152 * canal(v) + 0.0722 * canal(b);
};

/** Le rapport de contraste entre deux couleurs, de 1 à 21. */
export const contraste = (a: string, b: string): number => {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

/** Noir ou blanc, selon ce qui se lit le mieux sur ce fond. */
export const encreSur = (fond: string): string =>
  contraste(fond, "#FFFFFF") >= contraste(fond, "#1A1119") ? "#FFFFFF" : "#1A1119";

/* La même teinte, assombrie juste assez.
 *
 * On descend par pas de 4 % en gardant la teinte : la couleur reste
 * reconnaissable comme « la sienne », elle devient seulement lisible. Si
 * quinze pas ne suffisent pas, c'est que la teinte est très claire — on rend
 * alors la plus sombre atteinte, et l'interface propose de la garder pour le
 * fond plutôt que pour le texte. */
export const assombrir = (hex: string, cible = 4.5, fond = "#FFFFFF"): string => {
  let [r, v, b] = versRVB(hex);
  for (let i = 0; i < 15; i++) {
    if (contraste(enHex(r, v, b), fond) >= cible) break;
    r *= 0.96; v *= 0.96; b *= 0.96;
  }
  return enHex(r, v, b);
};

/** Un hexadécimal valide, six chiffres, dièse compris. */
export const hexValide = (v: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());
