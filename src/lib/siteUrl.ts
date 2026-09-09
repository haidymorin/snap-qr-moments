/* L'adresse à écrire dans un QR code, ou dans un lien qu'on donne à quelqu'un.
 *
 * Le code construisait ces liens avec window.location.origin. C'est juste
 * quand on travaille sur qr-memories.fr, et faux dès qu'on ouvre l'aperçu
 * Lovable : le lien produit pointe alors vers snap-qr-moments.lovable.app, qui
 * demande une connexion Lovable. Un invité qui scanne ce QR code tombe sur une
 * page de connexion à un outil de développement.
 *
 * Le risque n'est pas théorique : la signalétique est imprimée une fois, et
 * portée sur les tables le jour même. Une erreur ici ne se rattrape pas.
 *
 * Donc l'adresse publique est écrite en dur. En développement local, on garde
 * l'origine réelle — sinon on ne pourrait plus rien tester sur sa machine.
 */

const PRODUCTION = "https://qr-memories.fr";

const EST_LOCAL = (hote: string) =>
  hote === "localhost" || hote === "127.0.0.1" || hote === "[::1]" || hote.endsWith(".local");

export const siteOrigin = (): string => {
  if (typeof window === "undefined") return PRODUCTION;
  return EST_LOCAL(window.location.hostname) ? window.location.origin : PRODUCTION;
};

/** Le lien que scannent les invités. */
export const lienInvite = (eventId: string) => `${siteOrigin()}/event/${eventId}`;
