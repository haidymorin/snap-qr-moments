import { lazy, type ComponentType } from "react";

/* Quand le site est mis à jour, les fichiers de pages changent de nom. Un
   onglet resté ouvert continue de réclamer l'ancien nom : le fichier n'existe
   plus, la page devient blanche ("Failed to fetch dynamically imported
   module").

   Ici on réessaie une fois, puis on recharge la page une seule fois pour
   récupérer la version à jour — sans jamais boucler. */
const CLE = "qrm:rechargement-morceau";

export function lazyWithRetry<T extends ComponentType<never>>(
  importer: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      const mod = await importer();
      window.sessionStorage?.removeItem(CLE);
      return mod;
    } catch (erreur) {
      const dejaRecharge = window.sessionStorage?.getItem(CLE) === "1";
      if (!dejaRecharge) {
        window.sessionStorage?.setItem(CLE, "1");
        window.location.reload();
        // On rend une promesse jamais résolue le temps du rechargement.
        return new Promise<{ default: T }>(() => {});
      }
      throw erreur;
    }
  });
}
