/* L'identité d'un invité, sans compte et sans adresse.
 *
 * Une clé tirée au hasard sur son téléphone, gardée à côté de la liste de ses
 * envois. Elle ne dit rien de lui, ne le suit pas d'un événement à l'autre —
 * elle est propre à chaque galerie — et disparaît avec le navigateur.
 *
 * C'est le minimum pour qu'un jeu ait un sens : sans elle, impossible de
 * savoir qu'un défi a déjà été relevé, ni par qui.
 *
 * En navigation privée ou avec le stockage plein, on retombe sur une clé de
 * session : le jeu fonctionne le temps de la soirée et se perd ensuite. Un
 * dégradé acceptable — l'inverse, refuser de jouer, ne l'est pas.
 */

const cle = (eventId: string) => `qrm:invite:${eventId}`;
const prenomCle = (eventId: string) => `qrm:prenom:${eventId}`;

let secours: Record<string, string> = {};

const tirer = () =>
  (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)).replace(/-/g, "");

export const cleInvite = (eventId: string): string => {
  try {
    const existante = localStorage.getItem(cle(eventId));
    if (existante && existante.length >= 8) return existante;
    const neuve = tirer();
    localStorage.setItem(cle(eventId), neuve);
    return neuve;
  } catch {
    if (!secours[eventId]) secours[eventId] = tirer();
    return secours[eventId];
  }
};

export const lirePrenom = (eventId: string): string => {
  try {
    return localStorage.getItem(prenomCle(eventId)) ?? "";
  } catch {
    return "";
  }
};

export const noterPrenom = (eventId: string, prenom: string) => {
  try {
    localStorage.setItem(prenomCle(eventId), prenom.trim().slice(0, 40));
  } catch {
    /* Sans prénom, l'invité apparaît au classement sous « Un invité ». */
  }
};
