// Crée une session de paiement Stripe et renvoie l'adresse vers laquelle
// envoyer le client. Les montants sont définis ICI, côté serveur : le
// navigateur ne choisit qu'un identifiant de palier, jamais un prix.
//
// Secret attendu dans l'environnement : STRIPE_SECRET_KEY
// (clé de test sk_test_… tant que le compte n'est pas activé).

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Les paliers vendus. Montants en centimes d'euro. */
const PLANS: Record<string, { amount: number; label: string }> = {
  essentiel: { amount: 5900, label: "QR Memories · Essentiel" },
  souvenir: { amount: 17900, label: "QR Memories · Souvenir" },
  heritage: { amount: 39000, label: "QR Memories · Héritage" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const secret = Deno.env.get("STRIPE_SECRET_KEY");
    if (!secret) throw new Error("STRIPE_SECRET_KEY manquante");

    const { plan, origin } = await req.json();
    const chosen = PLANS[String(plan)];
    if (!chosen) throw new Error(`palier inconnu : ${plan}`);

    const site = String(origin || req.headers.get("origin") || "").replace(/\/$/, "");
    if (!site.startsWith("http")) throw new Error("origine invalide");

    // On appelle l'API Stripe directement : pas de dépendance à installer.
    const form = new URLSearchParams({
      mode: "payment",
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "eur",
      "line_items[0][price_data][unit_amount]": String(chosen.amount),
      "line_items[0][price_data][product_data][name]": chosen.label,
      success_url: `${site}/paiement-reussi?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/pricing`,
      locale: "fr",
      "metadata[plan]": String(plan),
      billing_address_collection: "auto",
    });

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });

    const session = await res.json();
    if (!res.ok) {
      throw new Error(session?.error?.message ?? "Stripe a refusé la demande");
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String((err as Error).message ?? err) }), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
