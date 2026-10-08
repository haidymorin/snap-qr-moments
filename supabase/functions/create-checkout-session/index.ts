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
// Deuxième usage, depuis le 8 octobre 2026 : les commandes passées après
// l'achat, depuis l'espace des mariés. Produits à la carte (album, mini-album,
// année d'hébergement) et montée de formule. La personne doit être connectée
// et propriétaire de l'événement ; le montant est, là aussi, décidé ici.
//
// Secrets attendus : STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "npm:@supabase/supabase-js@2";

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
  heritage: { amount: 25900, label: "QR Memories · Héritage" },
};

const TYPES = ["mariage", "anniversaire", "bapteme", "entreprise", "autre"];

/** Les produits à la carte. Montants en centimes d'euro. */
const PRODUITS: Record<string, { amount: number; label: string; physique: boolean; maxQuantite: number }> = {
  album:      { amount: 12900, label: "Album photo grand format", physique: true,  maxQuantite: 3 },
  mini_album: { amount: 4500,  label: "Mini-album",               physique: true,  maxQuantite: 10 },
  annee:      { amount: 2900,  label: "Une année de plus en ligne", physique: false, maxQuantite: 1 },
};

const ORDRE_PLANS = ["essentiel", "souvenir", "heritage"];

/* Une commande passée depuis l'espace des mariés. */
async function sessionCommande(
  req: Request, secret: string, site: string,
  corps: { eventId?: string; produit?: string; quantite?: number; planCible?: string },
): Promise<Response> {
  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Qui commande : le jeton de connexion envoyé par le navigateur.
  const jeton = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: qui } = await db.auth.getUser(jeton);
  if (!qui?.user) return json({ error: "connexion_requise" }, 401);

  const { data: ev } = await db
    .from("events")
    .select("id, name, plan, user_id, statut, expire_le, album_achete, albums_offerts")
    .eq("id", String(corps.eventId ?? ""))
    .maybeSingle();
  if (!ev) return json({ error: "evenement_inconnu" }, 404);

  const { data: estAdmin } = await db.rpc("est_admin", { p_user: qui.user.id });
  if (ev.user_id !== qui.user.id && estAdmin !== true) return json({ error: "acces_refuse" }, 403);
  if (ev.statut !== "actif") return json({ error: "galerie_fermee" }, 400);

  const produit = String(corps.produit ?? "");
  let montant = 0;
  let libelle = "";
  let quantite = 1;
  let planCible = "";

  if (produit === "montee") {
    planCible = String(corps.planCible ?? "");
    const avant = ORDRE_PLANS.indexOf(String(ev.plan));
    const apres = ORDRE_PLANS.indexOf(planCible);
    if (avant < 0 || apres <= avant) return json({ error: "montee_impossible" }, 400);
    montant = PLANS[planCible].amount - PLANS[String(ev.plan)].amount;
    libelle = `Passage à la formule ${PLANS[planCible].label.replace("QR Memories · ", "")}`;
  } else {
    const p = PRODUITS[produit];
    if (!p) return json({ error: "produit_inconnu" }, 400);
    if (produit === "album" && (ev.plan === "heritage" || ev.album_achete || ev.albums_offerts)) {
      return json({ error: "album_deja_inclus" }, 400);
    }
    quantite = Math.min(Math.max(1, Math.floor(Number(corps.quantite) || 1)), p.maxQuantite);
    montant = p.amount;
    libelle = p.label;
  }

  const form = new URLSearchParams({
    mode: "payment",
    "line_items[0][quantity]": String(quantite),
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": String(montant),
    "line_items[0][price_data][product_data][name]": `QR Memories · ${libelle}`,
    "line_items[0][price_data][product_data][description]": String(ev.name),
    success_url: `${site}/dashboard/event/${ev.id}?commande=ok`,
    cancel_url: `${site}/dashboard/event/${ev.id}?commande=annulee`,
    locale: "fr",
    allow_promotion_codes: "true",
    customer_email: qui.user.email ?? "",
    "metadata[genre]": "commande",
    "metadata[event_id]": String(ev.id),
    "metadata[produit]": produit,
    "metadata[quantite]": String(quantite),
    "metadata[plan_avant]": String(ev.plan),
    "metadata[plan_cible]": planCible,
  });
  if (!qui.user.email) form.delete("customer_email");

  /* Un album part par la poste : l'adresse de livraison est demandée par
     Stripe, sur la page de paiement, plutôt que dans un formulaire de plus. */
  if (produit === "album" || produit === "mini_album") {
    /* France seulement : les CGV incluent la livraison en France
       métropolitaine, et aucun tarif n'est fixé pour l'étranger. */
    form.set("shipping_address_collection[allowed_countries][0]", "FR");
  }

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const session = await res.json();
  if (!res.ok) return json({ error: session?.error?.message ?? "stripe_refuse" }, 400);
  return json({ url: session.url });
}

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

    const corps = await req.json();
    const { plan, origin, nom, date, type, email, executionAnticipee } = corps;

    const site = String(origin || req.headers.get("origin") || "").replace(/\/$/, "");
    if (!site.startsWith("http")) return json({ error: "origine_invalide" }, 400);

    if (corps.commande) return await sessionCommande(req, secret, site, corps.commande);

    const chosen = PLANS[String(plan)];
    if (!chosen) return json({ error: "palier_inconnu" }, 400);

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
      /* Affiche le champ « Ajouter un code promo » sur la page de paiement.
         Les codes se créent dans Stripe (Catalogue de produits → Coupons). */
      allow_promotion_codes: "true",
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
