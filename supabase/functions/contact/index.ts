// Reçoit une demande du formulaire de contact : elle est d'abord écrite en
// base, ensuite seulement notifiée par e-mail.
//
// Cet ordre n'est pas un détail. Une demande perdue, c'est un mariage perdu,
// et le formulaire précédent en perdait probablement la totalité : il ouvrait
// la messagerie du visiteur, ce qui ne fait rien du tout sur un ordinateur
// sans messagerie configurée. Si Resend tombe, la demande est quand même en
// base et se retrouve. L'inverse serait invisible.
//
// Le navigateur n'écrit jamais dans la table lui-même : sans cette fonction,
// l'adresse de la table serait un formulaire ouvert sur Internet.
//
// Secrets attendus : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY

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

const DESTINATAIRE = "contact@qr-memories.fr";
const EXPEDITEUR = "QR Memories <contact@qr-memories.fr>";

/* Trois demandes par heure et par adresse. Assez pour quelqu'un qui se
   ravise, trop peu pour un robot. */
const PLAFOND = 3;
const FENETRE_MS = 60 * 60 * 1000;

const propre = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

const echapper = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const corps = await req.json();

    /* Champ piège : invisible pour un humain, rempli par la plupart des
       robots. On répond « c'est envoyé » sans rien faire — un robot qui voit
       une erreur réessaie autrement. */
    if (propre(corps.site, 100)) return json({ ok: true });

    const nom = propre(corps.nom, 80);
    const email = propre(corps.email, 160).toLowerCase();
    const type = propre(corps.type, 80);
    const date = propre(corps.date, 10);
    const message = propre(corps.message, 4000);

    if (nom.length < 2) return json({ error: "nom_invalide" }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ error: "email_invalide" }, 400);
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: "date_invalide" }, 400);

    const depuis = new Date(Date.now() - FENETRE_MS).toISOString();
    const { count } = await db
      .from("demandes_contact")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .gte("cree_le", depuis);

    if ((count ?? 0) >= PLAFOND) return json({ error: "trop_de_demandes" }, 429);

    const { error: erreurBase } = await db.from("demandes_contact").insert({
      nom,
      email,
      type_evenement: type || null,
      date_evenement: date || null,
      message: message || null,
      origine: req.headers.get("origin"),
    });

    if (erreurBase) {
      console.error("contact/insert", erreurBase);
      return json({ error: "indisponible" }, 500);
    }

    /* À partir d'ici la demande est sauvée. Un échec d'envoi ne doit plus
       faire échouer la réponse au visiteur : il a bien été entendu, même si
       la notification n'arrive pas. */
    const cle = Deno.env.get("RESEND_API_KEY");
    if (!cle) {
      console.error("contact/envoi", "RESEND_API_KEY manquante");
      return json({ ok: true, notifie: false });
    }

    const lignes = [
      `Nom : ${nom}`,
      `E-mail : ${email}`,
      `Type d'événement : ${type || "non précisé"}`,
      `Date de l'événement : ${date || "non précisée"}`,
      "",
      message || "(pas de message)",
    ].join("\n");

    const envoi = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: EXPEDITEUR,
        to: [DESTINATAIRE],
        /* Répondre au message répond au visiteur, pas à soi-même. */
        reply_to: email,
        subject: `Demande — ${nom}${type ? ` · ${type}` : ""}`,
        text: lignes,
        html: `<pre style="font:14px/1.6 ui-monospace,monospace;white-space:pre-wrap">${echapper(lignes)}</pre>`,
      }),
    });

    if (!envoi.ok) {
      console.error("contact/envoi", envoi.status, await envoi.text());
      return json({ ok: true, notifie: false });
    }

    return json({ ok: true, notifie: true });
  } catch (e) {
    console.error("contact", e);
    return json({ error: "indisponible" }, 500);
  }
});
