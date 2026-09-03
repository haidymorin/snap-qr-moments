// Prévient les mariés trente jours avant la fermeture de leur galerie.
//
// L'hébergement dure six mois. Sans ce rappel, la galerie se ferme un matin
// sans que personne n'ait rien vu venir, et le client découvre la perte après
// coup — c'est exactement le genre d'histoire qui se raconte. Trente jours,
// c'est assez pour tout télécharger tranquillement, ou pour prolonger.
//
// Un seul rappel par événement : la date d'envoi est horodatée en base, et la
// fenêtre est large (28 à 32 jours) pour qu'une journée sans exécution ne
// fasse manquer personne.
//
// Appelée par une tâche planifiée quotidienne, avec la clé de service : elle
// n'est pas ouverte au navigateur.
//
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

const jour = (d: Date) => d.toISOString().slice(0, 10);

const enFrancais = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

Deno.serve(async () => {
  try {
    const maintenant = Date.now();
    const debut = jour(new Date(maintenant + 28 * 86_400_000));
    const fin = jour(new Date(maintenant + 32 * 86_400_000));

    const { data: evenements, error } = await db
      .from("events")
      .select("id, name, expire_le, user_id")
      .is("rappel_envoye_le", null)
      .not("expire_le", "is", null)
      .gte("expire_le", debut)
      .lte("expire_le", fin);

    if (error) {
      console.error("rappel/lecture", error);
      return json({ error: "indisponible" }, 500);
    }

    const cle = Deno.env.get("RESEND_API_KEY");
    if (!cle) {
      console.error("rappel", "RESEND_API_KEY manquante");
      return json({ error: "cle_manquante" }, 500);
    }

    let envoyes = 0;

    for (const ev of evenements ?? []) {
      /* L'adresse n'est pas dans la table : elle appartient au compte. On la
         relit à chaque fois plutôt que de la recopier, pour qu'un changement
         d'adresse soit pris en compte sans rien migrer. */
      const { data: compte } = await db.auth.admin.getUserById(ev.user_id as string);
      const destinataire = compte?.user?.email;
      if (!destinataire) continue;

      const date = enFrancais(ev.expire_le as string);
      const nom = (ev.name as string) || "votre événement";

      const texte = [
        `Bonjour,`,
        ``,
        `La galerie de « ${nom} » restera en ligne jusqu'au ${date}. Passé cette date, les photos et les vidéos seront effacées.`,
        ``,
        `Deux possibilités, et rien à faire si vous avez déjà tout récupéré :`,
        ``,
        `• Tout télécharger en une fois depuis votre espace : ${SITE}/dashboard`,
        `• Prolonger d'un an pour 29 € — répondez simplement à ce message.`,
        ``,
        `À bientôt,`,
        `QR Memories`,
      ].join("\n");

      const envoi = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: EXPEDITEUR,
          to: [destinataire],
          subject: `Votre galerie ferme le ${date}`,
          text: texte,
        }),
      });

      if (!envoi.ok) {
        console.error("rappel/envoi", ev.id, envoi.status, await envoi.text());
        continue;
      }

      /* Horodaté seulement après un envoi réussi : un échec réseau doit
         laisser l'événement éligible au passage du lendemain. */
      await db
        .from("events")
        .update({ rappel_envoye_le: new Date().toISOString() })
        .eq("id", ev.id);

      envoyes += 1;
    }

    return json({ ok: true, examines: evenements?.length ?? 0, envoyes });
  } catch (e) {
    console.error("rappel", e);
    return json({ error: "indisponible" }, 500);
  }
});
