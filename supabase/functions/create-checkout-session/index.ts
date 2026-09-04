// Crée une session de paiement Stripe et renvoie l'adresse vers laquelle
// envoyer le client. Les montants sont définis ICI, côté serveur : le
// navigateur ne choisit qu'un identifiant de palier, jamais un prix.
//
// Les informations de l'événement — nom, date, type — sont recueillies AVANT
// le paiement et voyagent dans les métadonnées Stripe. C'est le webhook qui
// s'en servira pour créer l'événement. Deux raisons de les demander si tôt :
// l'événement doit exister au moment même où l'argent est encaissé, et la date
// détermine à elle seule si le renoncement au délai de rétractation doit être
// demandé.
//
// Secret attendu : STRIPE_SECRET_KEY

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

/** Les paliers vendus. Montants en centimes d'euro. */
const PLANS: Record<string, { amount: number; label: string }> = {
  essentiel: { amount: 5900, label: "QR Memories · Essentiel" },
  souvenir: { amount: 17900, label: "QR Memories · Souvenir" },
  heritage: { amount: 39000, label: "QR Memories · Héritage" },
};

const TYPES = ["mariage", "anniversaire", "bapteme", "entreprise", "autre"];

/* Le délai légal de rétractation : quatorze jours. Un mariage qui a lieu dans
   dix jours serait terminé avant la fin du délai, donc le service doit
   commencer avant. La loi l'autorise, à une condition : que le client demande
   expressément cette exécution anticipée et reconnaisse qu'il perd son droit de
   rétractation. Sans cette case, on ne prend pas l'argent. */
const DELAI_RETRACTATION = 14;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const secret = Deno.env.get("STRIPE_SECRET_KEY");
    if (!secret) throw new Error("STRIPE_SECRET_KEY manquante");

    const { plan, origin, nom, date, type, email, executionAnticipee } = await req.json();

    const chosen = PLANS[String(plan)];
    if (!chosen) return json({ error: "palier_inconnu" }, 400);

    const site = String(origin || req.headers.get("origin") || "").replace(/\/$/, "");
    if (!site.startsWith("http")) return json({ error: "origine_invalide" }, 400);

    const titre = String(nom ?? "").trim();
    if (titre.length < 2 || titre.length > 80) return json({ error: "nom_invalide" }, 400);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return json({ error: "date_invalide" }, 400);
    const jour = new Date(`${date}T12:00:00Z`);
    if (Number.isNaN(jour.getTime())) return json({ error: "date_invalide" }, 400);

    const joursRestants = Math.ceil((jour.getTime() - Date.now()) / 86_400_000);
    if (joursRestants < 0) return json({ error: "date_passee" }, 400);
    if (joursRestants < DELAI_RETRACTATION && executionAnticipee !== true) {
      return json({ error: "consentement_requis", joursRestants }, 400);
    }

    const genre = TYPES.includes(String(type)) ? String(type) : "autre";

    /* L'adresse est facultative ici : elle sert seulement à préremplir la page
       de paiement pour éviter à la personne de la retaper. Si elle est
       douteuse, on l'ignore plutôt que de refuser la vente — Stripe la
       redemandera de toute façon. */
    const adresse = String(email ?? "").trim().toLowerCase();
    const adresseUtilisable =
      adresse.length > 0 && adresse.length <= 254 && /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(adresse);

    const form = new URLSearchParams({
      mode: "payment",
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "eur",
      "line_items[0][price_data][unit_amount]": String(chosen.amount),
      "line_items[0][price_data][product_data][name]": chosen.label,
      "line_items[0][price_data][product_data][description]": `${titre} · ${date}`,
      success_url: `${site}/paiement-reussi?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/pricing`,
      locale: "fr",
      billing_address_collection: "auto",
      "metadata[plan]": String(plan),
      "metadata[nom]": titre,
      "metadata[date]": String(date),
      "metadata[type]": genre,
      "metadata[execution_anticipee]": executionAnticipee === true ? "oui" : "non",
    });

    if (adresseUtilisable) form.set("customer_email", adresse);

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });

    const session = await res.json();
    if (!res.ok) return json({ error: session?.error?.message ?? "stripe_refuse" }, 400);

    return json({ url: session.url });
  } catch (err) {
    console.error("create-checkout-session", err);
    return json({ error: String((err as Error).message ?? err) }, 400);
  }
});
