// Ce que la page de confirmation demande, juste après le paiement :
// « voici mon identifiant de session, qu'est-ce que je viens d'acheter, et
// comment j'entre chez moi ? »
//
// Le lien de connexion est délivré ici plutôt qu'envoyé par e-mail, pour une
// raison de terrain : la personne vient de payer, elle est devant son écran,
// et lui demander d'aller relever sa boîte mail à cet instant, c'est perdre la
// moitié des gens. L'e-mail reste utile plus tard, pour revenir.
//
// Trois garde-fous, parce que l'identifiant de session voyage dans une adresse :
//   - trente minutes après le paiement, pas une de plus ;
//   - une seule fois, la délivrance est horodatée en base ;
//   - au-delà, la page renvoie vers la connexion ordinaire.
//
// Secrets attendus : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "@supabase/supabase-js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

/** Trente minutes. Le temps de finir de payer et de revenir, pas davantage. */
const FENETRE_MS = 30 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const { sessionId } = await req.json();
    if (!sessionId || typeof sessionId !== "string") return json({ error: "requete_incomplete" }, 400);

    const { data: paiement } = await db
      .from("paiements")
      .select("stripe_session_id, event_id, email, plan, recu_le, acces_delivre_le")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    // Stripe peut nous prévenir une poignée de secondes après le retour du
    // client. Ce n'est pas une erreur : c'est « pas encore ».
    if (!paiement) return json({ statut: "en_attente" });
    if (!paiement.event_id) return json({ statut: "en_attente" });

    const { data: evenement } = await db
      .from("events")
      .select("id, name, event_date, event_type, plan, expire_le")
      .eq("id", paiement.event_id)
      .maybeSingle();

    const frais = Date.now() - new Date(paiement.recu_le).getTime() < FENETRE_MS;
    const jamaisDelivre = !paiement.acces_delivre_le;

    /* On ne renvoie PAS le lien tout fait que produit Supabase : ce lien passe
       par l'adresse de redirection configurée dans le projet, et toute adresse
       non déclarée y est silencieusement remplacée par celle du site d'origine.
       Le jour où le nom de domaine change, le client se retrouve renvoyé sur
       l'ancien site sans que rien ne signale l'erreur.

       On renvoie donc le jeton seul. Le navigateur l'échange lui-même contre
       une session (verifyOtp), sans redirection, sans liste d'adresses à tenir
       à jour. Le jeton est aussi sensible que le lien qui le contenait : il ne
       sort qu'une fois, dans les trente minutes qui suivent le paiement. */
    let jeton: string | null = null;
    if (frais && jamaisDelivre && paiement.email) {
      const { data: genere } = await db.auth.admin.generateLink({
        type: "magiclink",
        email: paiement.email,
      });
      jeton = genere?.properties?.hashed_token ?? null;
      if (jeton) {
        await db.from("paiements")
          .update({ acces_delivre_le: new Date().toISOString() })
          .eq("stripe_session_id", sessionId);
      }
    }

    return json({ statut: "pret", evenement, jeton });
  } catch (e) {
    console.error("commande-statut", e);
    return json({ error: "indisponible" }, 500);
  }
});
