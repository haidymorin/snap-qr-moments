// Envoie le mot de remerciement des mariés, à l'heure qu'ils ont choisie.
//
// Pourquoi le lendemain soir et pas le jour même : le soir du mariage, les
// invités déposent ce qu'ils ont sous la main. Le lendemain vers 20 h, ils
// trient enfin leurs photos de la veille. C'est le seul moment où la galerie
// leur revient en tête, et c'est exactement là que le message arrive.
//
// Les destinataires sont uniquement les invités qui ont laissé leur adresse
// dans la galerie pour en recevoir le lien. On ne construit pas une liste de
// diffusion à partir d'un mariage.
//
// Un événement n'est traité qu'une fois : `merci_envoye_le` est posé avant
// l'envoi. Si Resend tombe au milieu, on préfère un message manquant à
// quatre-vingts doublons dans la boîte des invités.
//
// Appelée par une tâche planifiée horaire, avec la clé de service.
// Secrets attendus : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY

import { createClient } from "@supabase/supabase-js";

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const EXPEDITEUR = "QR Memories <contact@qr-memories.fr>";
const SITE = "https://qr-memories.fr";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

const echapper = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* Le texte des mariés est écrit dans un champ libre : on garde les
   paragraphes, on n'interprète rien d'autre. */
const paragraphes = (texte: string) =>
  texte
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px">${echapper(p).replace(/\n/g, "<br>")}</p>`)
    .join("");

interface Ev {
  id: string;
  name: string;
  merci_texte: string | null;
}

Deno.serve(async () => {
  try {
    const maintenant = new Date().toISOString();

    const { data, error } = await db
      .from("events")
      .select("id,name,merci_texte")
      .lte("merci_envoi_le", maintenant)
      .is("merci_envoye_le", null)
      .not("merci_texte", "is", null)
      .limit(50);

    if (error) {
      console.error("merci/lecture", error);
      return json({ error: "indisponible" }, 500);
    }

    const evenements = (data ?? []) as Ev[];
    if (evenements.length === 0) return json({ ok: true, traites: 0 });

    const cle = Deno.env.get("RESEND_API_KEY");
    if (!cle) {
      console.error("merci/envoi", "RESEND_API_KEY manquante");
      return json({ error: "indisponible" }, 500);
    }

    let envoyes = 0;

    for (const ev of evenements) {
      const texte = (ev.merci_texte ?? "").trim();
      if (!texte) continue;

      const { data: contacts } = await db
        .from("guest_contacts")
        .select("email")
        .eq("event_id", ev.id)
        .not("email", "is", null);

      const adresses = [...new Set(
        (contacts ?? []).map((c) => (c.email ?? "").trim().toLowerCase()).filter(Boolean),
      )];

      /* Marqué AVANT l'envoi : un doublon dans la boîte d'un invité est pire
         qu'un message manquant, et c'est le genre d'erreur qu'on ne rattrape
         pas. Un événement sans destinataire est marqué aussi, sinon la tâche
         le reprendrait toutes les heures. */
      await db
        .from("events")
        .update({ merci_envoye_le: new Date().toISOString() })
        .eq("id", ev.id);

      if (adresses.length === 0) continue;

      const lien = `${SITE}/event/${ev.id}`;
      const corps = `
        <div style="font:16px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1B1512;max-width:520px;margin:0 auto;padding:32px 24px">
          ${paragraphes(texte)}
          <p style="margin:32px 0 0">
            <a href="${lien}" style="display:inline-block;background:#46283F;color:#F6F2EB;text-decoration:none;padding:14px 26px;border-radius:999px;font-weight:600">
              Ajouter mes photos
            </a>
          </p>
          <p style="margin:24px 0 0;font-size:13.5px;color:#6E6259">
            Vous recevez ce message parce que vous avez laissé votre adresse dans
            la galerie de ${echapper(ev.name)} pour en recevoir le lien.
            Elle ne sert à rien d'autre et disparaît avec la galerie.
          </p>
        </div>`;

      /* Les adresses partent en copie cachée : un invité n'a pas à découvrir
         le carnet d'adresses des autres invités. */
      const envoi = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: EXPEDITEUR,
          to: ["contact@qr-memories.fr"],
          bcc: adresses.slice(0, 400),
          subject: `Un mot de ${ev.name}`,
          html: corps,
        }),
      });

      if (!envoi.ok) {
        console.error("merci/envoi", ev.id, envoi.status, await envoi.text());
        continue;
      }
      envoyes += 1;
    }

    return json({ ok: true, traites: evenements.length, envoyes });
  } catch (e) {
    console.error("mot-de-merci", e);
    return json({ error: "indisponible" }, 500);
  }
});
