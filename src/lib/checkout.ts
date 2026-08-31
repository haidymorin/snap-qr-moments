import { supabase } from "@/integrations/supabase/client";

export type PlanId = "essentiel" | "souvenir" | "heritage";

/* Envoie le visiteur vers la page de paiement Stripe.
 * Le navigateur n'envoie qu'un identifiant de palier : le montant est
 * décidé par la fonction serveur, jamais par la page. */
export async function startCheckout(plan: PlanId): Promise<void> {
  const { data, error } = await supabase.functions.invoke("create-checkout-session", {
    body: { plan, origin: window.location.origin },
  });

  if (error) throw new Error(error.message);
  if (!data?.url) throw new Error(data?.error ?? "réponse inattendue");

  window.location.href = data.url as string;
}
