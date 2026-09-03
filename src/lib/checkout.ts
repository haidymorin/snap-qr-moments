import { supabase } from "@/integrations/supabase/client";

export type PlanId = "essentiel" | "souvenir" | "heritage";

/** Le délai légal de rétractation, en jours. Doit rester identique au serveur. */
export const DELAI_RETRACTATION = 14;

export interface Commande {
  plan: PlanId;
  /** Le nom que porteront la galerie et la signalétique. */
  nom: string;
  /** Format AAAA-MM-JJ. */
  date: string;
  type: string;
  /** Renoncement au délai de rétractation, obligatoire à moins de 14 jours. */
  executionAnticipee?: boolean;
}

export const joursAvant = (date: string): number | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const jour = new Date(`${date}T12:00:00Z`).getTime();
  if (Number.isNaN(jour)) return null;
  return Math.ceil((jour - Date.now()) / 86_400_000);
};

/* Faut-il demander le renoncement ?
 *
 * Un mariage qui a lieu dans dix jours serait terminé avant la fin du délai de
 * rétractation : le service doit donc commencer pendant ce délai. La loi
 * l'autorise, à une condition — que le client le demande expressément et
 * reconnaisse qu'il perd son droit de rétractation. La même règle est
 * revérifiée côté serveur : celle-ci ne sert qu'à afficher la case au bon
 * moment. */
export const renoncementRequis = (date: string): boolean => {
  const j = joursAvant(date);
  return j !== null && j >= 0 && j < DELAI_RETRACTATION;
};

const MOTIFS: Record<string, string> = {
  palier_inconnu: "Cette formule n'existe pas.",
  origine_invalide: "Adresse du site non reconnue.",
  nom_invalide: "Donnez un nom à votre événement, entre 2 et 80 caractères.",
  date_invalide: "La date n'est pas valide.",
  date_passee: "Cette date est déjà passée.",
  consentement_requis:
    "Votre événement a lieu dans moins de quatorze jours : cochez la case pour que nous puissions commencer tout de suite.",
  stripe_refuse: "Le paiement n'a pas pu être ouvert. Réessayez dans un instant.",
};

/* Envoie le visiteur vers la page de paiement Stripe.
 *
 * Le navigateur n'envoie qu'un identifiant de palier : le montant est décidé
 * par la fonction serveur, jamais par la page. Les informations de l'événement
 * voyagent avec la commande, et c'est le webhook Stripe qui s'en servira pour
 * créer l'événement au moment où l'argent est encaissé. */
export async function startCheckout(commande: Commande): Promise<void> {
  const { data, error } = await supabase.functions.invoke("create-checkout-session", {
    body: {
      plan: commande.plan,
      origin: window.location.origin,
      nom: commande.nom,
      date: commande.date,
      type: commande.type,
      executionAnticipee: commande.executionAnticipee === true,
    },
  });

  if (data?.url) {
    window.location.href = data.url as string;
    return;
  }

  /* `functions.invoke` ne rend pas le corps des réponses d'erreur : le motif
     exact est dans la réponse HTTP, qu'il faut aller relire. Sans cela, un
     refus de consentement s'afficherait comme une panne réseau. */
  let code = data?.error as string | undefined;
  const contexte = (error as { context?: unknown } | null)?.context;
  if (!code && contexte instanceof Response) {
    try {
      code = (await contexte.clone().json())?.error;
    } catch {
      /* corps illisible */
    }
  }
  throw new Error(MOTIFS[code ?? ""] ?? code ?? error?.message ?? "Réponse inattendue.");
}
