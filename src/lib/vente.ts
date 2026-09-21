/* L'interrupteur de vente.
 *
 * Tant que la micro-entreprise n'est pas immatriculée, encaisser serait une
 * activité commerciale non déclarée. On ne ferme pas le site pour autant :
 * on remplace « payer » par « réserver sa date », ce qui est parfaitement
 * légal — aucun argent ne change de main, aucune facture n'est émise — et
 * ce qui constitue, en attendant, la seule chose qui compte vraiment : une
 * liste de mariages à venir avec leur date et une adresse pour prévenir.
 *
 * Le jour où le SIRET arrive, il y a UNE ligne à changer ici. Rien d'autre :
 * tous les liens du site passent par `lienAchat`, et `/creer` se contente de
 * rediriger tant que la vente est fermée. C'est volontairement le seul
 * endroit du code qui connaisse cette information.
 */

export const VENTE_OUVERTE: boolean = true;

/** Où mène un appel à l'action. La formule est conservée dans l'adresse. */
export const lienAchat = (formule?: string) => {
  const base = VENTE_OUVERTE ? "/creer" : "/reserver";
  return formule ? `${base}?formule=${formule}` : base;
};

/** La clé de traduction du libellé, pour ne pas promettre ce qu'on ne fait pas. */
export const cleAchat = VENTE_OUVERTE ? "home.ctaCreate" : "home.ctaReserve";
