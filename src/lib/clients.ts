import { supabase } from "@/integrations/supabase/client";
import type { PlanId } from "@/lib/checkout";

/* L'enregistrement des coordonnées, au premier pas du parcours d'achat.
 *
 * Appelé AVANT le paiement, volontairement : quelqu'un qui remplit son nom et
 * sa date puis referme l'onglet devant la page bancaire est exactement la
 * personne à qui il faudra écrire. Sans cet appel, on ne saurait pas qu'elle
 * est passée.
 *
 * L'échec est silencieux et c'est assumé : si la base refuse, la personne doit
 * pouvoir payer quand même. Perdre une adresse est ennuyeux, perdre une vente
 * l'est davantage.
 */

export interface Coordonnees {
  email: string;
  prenom: string;
  nom: string;
  telephone?: string;
  marketing: boolean;
  evenementNom?: string;
  evenementDate?: string;
  evenementType?: string;
  formule?: PlanId | null;
}

export async function enregistrerClient(c: Coordonnees): Promise<void> {
  try {
    const { error } = await supabase.rpc("enregistrer_client", {
      p_email: c.email,
      p_prenom: c.prenom || null,
      p_nom: c.nom || null,
      p_telephone: c.telephone || null,
      p_marketing: c.marketing,
      p_ev_nom: c.evenementNom || null,
      p_ev_date: c.evenementDate || null,
      p_ev_type: c.evenementType || null,
      p_formule: c.formule || null,
    });
    if (error) console.warn("enregistrerClient", error.message);
  } catch (e) {
    console.warn("enregistrerClient", e);
  }
}
