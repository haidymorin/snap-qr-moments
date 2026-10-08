// Ce que Stripe nous dit quand un paiement aboutit.
//
// C'est ici, et nulle part ailleurs, que naît un événement payant. Pas dans le
// navigateur : un téléphone qui se met en veille sur la page de confirmation,
// une connexion qui lâche à la sortie de la banque, et le client aurait payé
// sans rien recevoir. Stripe, lui, réessaie pendant trois jours.
//
// Secrets attendus : STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
//                    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "@supabase/supabase-js";

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

/** Cinq minutes : au-delà, une signature valide est un rejeu. */
const TOLERANCE = 300;
/** La durée d'hébergement vendue, identique pour toutes les formules. */
const MOIS_INCLUS = 6;

const hex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

/* Comparaison à temps constant : comparer deux signatures avec === laisse
   fuiter, par la durée du test, l'endroit où elles divergent. */
function egales(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function signatureValide(corps: string, entete: string, secret: string): Promise<boolean> {
  const parties = Object.fromEntries(
    entete.split(",").map((p) => p.split("=", 2) as [string, string]),
  );
  const horodatage = Number(parties.t);
  if (!horodatage || !parties.v1) return false;
  if (Math.abs(Date.now() / 1000 - horodatage) > TOLERANCE) return false;

  const cle = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const attendue = hex(
    await crypto.subtle.sign("HMAC", cle, new TextEncoder().encode(`${horodatage}.${corps}`)),
  );
  return egales(attendue, parties.v1);
}

/** L'identifiant du compte lié à cette adresse, créé s'il n'existe pas encore. */
async function compteDe(email: string): Promise<string> {
  const { data: profil } = await db
    .from("profiles").select("id").ilike("email", email).maybeSingle();
  if (profil?.id) return profil.id as string;

  const { data, error } = await db.auth.admin.createUser({
    email,
    email_confirm: true, // l'adresse vient de Stripe : elle est déjà vérifiée par le paiement
  });
  if (error || !data.user) throw new Error(`création du compte : ${error?.message}`);
  return data.user.id;
}

/* Une commande passée depuis l'espace des mariés : produit à la carte ou
   montée de formule. L'événement existe déjà ; on enregistre la commande, puis
   on applique son effet une seule fois (colonne `applique_le`). */
async function traiterCommande(
  session: Record<string, any>, meta: Record<string, string>, email: string,
) {
  const eventId = meta.event_id;
  const produit = meta.produit;
  const adresse = session.shipping_details ?? session.collected_information?.shipping_details ?? null;

  const { error: erreurInsert } = await db.from("commandes").insert({
    event_id: eventId,
    produit,
    quantite: Number(meta.quantite) || 1,
    montant_centimes: session.amount_total ?? 0,
    plan_avant: meta.plan_avant || null,
    plan_cible: meta.plan_cible || null,
    stripe_session_id: session.id,
    adresse_livraison: adresse,
    email,
  });
  if (erreurInsert && erreurInsert.code !== "23505") throw erreurInsert;

  const { data: commande } = await db
    .from("commandes").select("id, applique_le").eq("stripe_session_id", session.id).single();

  if (commande && !commande.applique_le) {
    if (produit === "album") {
      await db.from("events").update({ album_achete: true }).eq("id", eventId);
    } else if (produit === "annee") {
      const { data: ev } = await db.from("events").select("expire_le").eq("id", eventId).single();
      const base = new Date(Math.max(Date.now(), new Date(`${ev?.expire_le ?? ""}T12:00:00Z`).getTime() || 0));
      base.setUTCFullYear(base.getUTCFullYear() + 1);
      // Le rappel des trente jours repartira avant la nouvelle échéance.
      await db.from("events")
        .update({ expire_le: base.toISOString().slice(0, 10), rappel_envoye_le: null })
        .eq("id", eventId);
    } else if (produit === "montee" && meta.plan_cible) {
      await db.from("events").update({ plan: meta.plan_cible })
        .eq("id", eventId).eq("plan", meta.plan_avant);
    }
    await db.from("commandes").update({ applique_le: new Date().toISOString() }).eq("id", commande.id);
  }

  await db.from("paiements").update({ event_id: eventId }).eq("stripe_session_id", session.id);

  /* L'administratrice est prévenue de chaque commande. Un album à imprimer
     qui dort dans une table ne part jamais. Un échec d'envoi ne doit pas
     faire rejouer le paiement. */
  try {
    const cle = Deno.env.get("RESEND_API_KEY");
    if (cle) {
      const noms: Record<string, string> = {
        album: "Album grand format", mini_album: "Mini-album",
        annee: "Une année de plus en ligne", montee: `Passage à la formule ${meta.plan_cible}`,
      };
      const lignes = [
        `${noms[produit] ?? produit} × ${meta.quantite || 1}`,
        `Montant : ${((session.amount_total ?? 0) / 100).toFixed(2).replace(".", ",")} €`,
        `Client : ${email}`,
        adresse ? `Livraison : ${JSON.stringify(adresse.address ?? adresse)}` : "",
        `Événement : https://qr-memories.fr/dashboard/event/${eventId}`,
      ].filter(Boolean);
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "QR Memories <contact@qr-memories.fr>",
          to: ["contact@qr-memories.fr"],
          subject: `Nouvelle commande : ${noms[produit] ?? produit}`,
          text: lignes.join("\n"),
        }),
      });
    }
  } catch (e) {
    console.error("stripe-webhook notification commande", e);
  }
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const entete = req.headers.get("stripe-signature");
  const corps = await req.text();

  if (!secret || !entete || !(await signatureValide(corps, entete, secret))) {
    // 400 et pas 401 : Stripe ne réessaie pas une requête qu'il n'a pas signée.
    return new Response("signature invalide", { status: 400 });
  }

  const evenement = JSON.parse(corps);
  if (evenement.type !== "checkout.session.completed") {
    return new Response("ignoré", { status: 200 });
  }

  const session = evenement.data.object;
  const meta = session.metadata ?? {};
  const email = session.customer_details?.email ?? session.customer_email;

  try {
    if (!email) throw new Error("aucune adresse e-mail dans la session");

    /* La trace du paiement d'abord, et c'est elle qui rend l'opération sûre au
       rejeu : l'identifiant de session est la clé primaire, donc un webhook
       reçu deux fois n'encaisse pas deux fois. */
    const { error: dejaVu } = await db.from("paiements").insert({
      stripe_session_id: session.id,
      email,
      plan: meta.plan ?? null,
      montant_centimes: session.amount_total ?? null,
      devise: session.currency ?? "eur",
      charge_utile: { metadata: meta, mode: session.mode },
    });
    if (dejaVu) {
      if (dejaVu.code !== "23505") throw dejaVu;
      /* La ligne existait déjà. Deux cas très différents : soit l'événement a
         bien été créé la première fois et il n'y a rien à refaire, soit la
         création avait échoué après l'écriture de la trace — et il faut alors
         reprendre là où on s'était arrêté, sinon le client resterait
         indéfiniment payé et sans événement. */
      const { data: trace } = await db
        .from("paiements").select("event_id").eq("stripe_session_id", session.id).maybeSingle();
      if (trace?.event_id) return new Response("déjà traité", { status: 200 });
    }

    if (meta.genre === "commande") {
      await traiterCommande(session, meta, email);
      return new Response("ok", { status: 200 });
    }

    const proprietaire = await compteDe(email);
    const paye = new Date();
    const echeance = new Date(paye);
    echeance.setMonth(echeance.getMonth() + MOIS_INCLUS);

    const { data: cree, error: erreurEvent } = await db.from("events").insert({
      user_id: proprietaire,
      name: meta.nom || "Notre événement",
      event_date: meta.date,
      event_type: meta.type || "mariage",
      plan: meta.plan ?? "essentiel",
      statut: "actif",
      paye_le: paye.toISOString(),
      expire_le: echeance.toISOString().slice(0, 10),
      stripe_session_id: session.id,
    }).select("id").single();
    if (erreurEvent) throw erreurEvent;

    await db.from("paiements").update({ event_id: cree.id }).eq("stripe_session_id", session.id);

    /* Le fichier clients apprend que la vente est faite. La ligne existe déjà
       dans neuf cas sur dix — elle a été écrite au premier pas du parcours —
       mais pas toujours : un paiement peut arriver d'un lien direct. On la
       crée alors, sans consentement commercial : payer n'est pas s'abonner à
       une newsletter.

       Volontairement après la création de l'événement, et sans jamais faire
       échouer le webhook : une erreur ici ferait rejouer tout le traitement
       par Stripe pour une colonne de statistiques. */
    try {
      await db.rpc("enregistrer_client", {
        p_email: email,
        p_ev_nom: meta.nom || null,
        p_ev_date: meta.date || null,
        p_ev_type: meta.type || null,
        p_formule: meta.plan || null,
      });
      await db.from("clients")
        .update({ a_achete: true, premier_achat_le: paye.toISOString() })
        .ilike("email", email);
    } catch (e) {
      console.error("stripe-webhook fichier clients", e);
    }

    return new Response("ok", { status: 200 });
  } catch (e) {
    // 500 volontaire : Stripe réessaiera, et la ligne de paiement déjà écrite
    // évitera le doublon. Mieux vaut un client servi en retard qu'un client
    // qui a payé pour rien.
    console.error("stripe-webhook", session?.id, e);
    return new Response("erreur de traitement", { status: 500 });
  }
});
