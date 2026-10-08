// Les envois de l'heure : le lien de la galerie aux invités, et l'alerte
// « album validé » à l'administratrice.
//
// ── 1. Le lien de la galerie ────────────────────────────────────────────────
//
// L'invité qui laisse son adresse lit « vous recevrez le lien de la galerie ».
// Jusqu'au 8 octobre 2026, ce n'était vrai que si les mariés avaient écrit un
// mot de remerciement : sans mot, aucun e-mail ne partait. Et l'invité qui
// laissait son adresse après l'envoi ne recevait jamais rien.
//
// La règle est désormais :
//
//   · chaque invité reçoit le lien UNE fois — marqué dans
//     `guest_contacts.last_reminded_at`, posé AVANT l'envoi ;
//   · l'heure d'envoi est celle choisie par les mariés s'ils ont écrit un mot,
//     sinon le lendemain de l'événement à 20 h, heure de Paris ;
//   · le texte est le mot des mariés s'il existe, sinon un message simple ;
//   · un invité inscrit après cette heure reçoit le même message dans l'heure
//     qui suit son inscription.
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
// ── 2. L'album validé ───────────────────────────────────────────────────────
//
// Quand des mariés de la formule Héritage valident leur album, l'administratrice
// reçoit un e-mail avec le lien de la page de composition, d'où elle télécharge
// les fichiers dans l'ordre pour l'imprimeur. Sans cet e-mail, un album validé
// pourrait attendre des semaines sans que personne ne le sache.
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
const ADMINISTRATRICE = "contact@qr-memories.fr";
const SITE = "https://qr-memories.fr";

/* Resend refuse plus de cinquante destinataires par message, copies cachées
   comprises. Quarante-cinq laisse de la marge. */
const PAR_MESSAGE = 45;

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

/** Le lendemain de `dateIso` (AAAA-MM-JJ) à `heure` h, heure de Paris. */
function lendemainAParis(dateIso: string, heure: number): Date {
  const [a, m, j] = dateIso.split("-").map(Number);
  const approx = new Date(Date.UTC(a, m - 1, j + 1, heure));
  const hParis = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hourCycle: "h23" })
      .formatToParts(approx)
      .find((p) => p.type === "hour")?.value ?? heure + 1,
  );
  return new Date(approx.getTime() - (hParis - heure) * 3_600_000);
}

const MESSAGE_SIMPLE = (nom: string) =>
  `Bonsoir,\n\nVous étiez à ${nom}. La galerie est ouverte : retrouvez toutes les photos de la ` +
  `soirée, et ajoutez celles qui dorment encore dans votre téléphone.\n\n` +
  `Good evening — you were at ${nom}. The gallery is open: see every photo from the party, ` +
  `and add the ones still on your phone.`;

interface Ev {
  id: string;
  name: string;
  event_date: string;
  statut: string;
  expire_le: string | null;
  merci_texte: string | null;
  merci_envoi_le: string | null;
  merci_envoye_le: string | null;
}

async function envoyer(cle: string, corps: Record<string, unknown>) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: EXPEDITEUR, ...corps }),
  });
  if (!r.ok) throw new Error(`resend ${r.status} ${await r.text()}`);
}

async function liensDeGalerie(cle: string, maintenant: Date) {
  const rapport = { evenements: 0, invites: 0, echecs: 0 };

  // Les invités qui attendent encore leur lien.
  const { data: attente, error } = await db
    .from("guest_contacts")
    .select("id, event_id, email")
    .is("last_reminded_at", null)
    .not("email", "is", null)
    .limit(2000);
  if (error) throw error;
  if (!attente?.length) return rapport;

  const idsEvenements = [...new Set(attente.map((c) => c.event_id))];
  const { data: evs } = await db
    .from("events")
    .select("id,name,event_date,statut,expire_le,merci_texte,merci_envoi_le,merci_envoye_le")
    .in("id", idsEvenements);

  const aujourdhui = maintenant.toISOString().slice(0, 10);

  for (const ev of (evs ?? []) as Ev[]) {
    // Une galerie fermée n'a plus de lien à donner.
    if (ev.statut !== "actif") continue;
    if (ev.expire_le && ev.expire_le < aujourdhui) continue;

    const mot = (ev.merci_texte ?? "").trim();
    const motProgramme = mot.length > 0 && ev.merci_envoi_le;
    const heure = motProgramme ? new Date(ev.merci_envoi_le!) : lendemainAParis(ev.event_date, 20);
    if (heure > maintenant) continue;

    const contacts = attente.filter((c) => c.event_id === ev.id);
    const adresses = [...new Set(
      contacts.map((c) => (c.email ?? "").trim().toLowerCase()).filter(Boolean),
    )];

    /* Marqué AVANT l'envoi : un doublon dans la boîte d'un invité est pire
       qu'un message manquant, et c'est le genre d'erreur qu'on ne rattrape
       pas. Les échecs restent visibles dans les journaux de la fonction. */
    await db
      .from("guest_contacts")
      .update({ last_reminded_at: maintenant.toISOString() })
      .in("id", contacts.map((c) => c.id));
    if (!ev.merci_envoye_le) {
      await db.from("events").update({ merci_envoye_le: maintenant.toISOString() }).eq("id", ev.id);
    }
    if (adresses.length === 0) continue;

    const lien = `${SITE}/event/${ev.id}`;
    const html = `
      <div style="font:16px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#3A2E32;background:#F5F1EA;max-width:520px;margin:0 auto;padding:32px 24px">
        ${paragraphes(motProgramme ? mot : MESSAGE_SIMPLE(ev.name))}
        <p style="margin:32px 0 0">
          <a href="${lien}" style="display:inline-block;background:#3A2E32;color:#F5F1EA;text-decoration:none;padding:14px 26px;font-weight:600">
            Voir la galerie et ajouter mes photos
          </a>
        </p>
        <p style="margin:24px 0 0;font-size:13.5px;color:#6E6164">
          Vous recevez ce message parce que vous avez laissé votre adresse dans
          la galerie de ${echapper(ev.name)} pour en recevoir le lien.
          Elle ne sert à rien d'autre et disparaît avec la galerie.
        </p>
      </div>`;
    const sujet = motProgramme ? `Un mot de ${ev.name}` : `Les photos de ${ev.name}`;

    /* Les adresses partent en copie cachée : un invité n'a pas à découvrir
       le carnet d'adresses des autres invités. */
    for (let i = 0; i < adresses.length; i += PAR_MESSAGE) {
      try {
        await envoyer(cle, {
          to: [ADMINISTRATRICE],
          bcc: adresses.slice(i, i + PAR_MESSAGE),
          subject: sujet,
          html,
        });
        rapport.invites += Math.min(PAR_MESSAGE, adresses.length - i);
      } catch (e) {
        console.error("lien-galerie/envoi", ev.id, e);
        rapport.echecs += 1;
      }
    }
    rapport.evenements += 1;
  }
  return rapport;
}

async function albumsValides(cle: string, maintenant: Date) {
  const { data, error } = await db
    .from("events")
    .select("id,name,event_date,album_valide_le")
    .not("album_valide_le", "is", null)
    .is("album_notifie_le", null)
    .is("album_imprime_le", null)
    .limit(20);
  if (error) throw error;

  let n = 0;
  for (const ev of data ?? []) {
    const { count } = await db
      .from("album_pages")
      .select("id", { count: "exact", head: true })
      .eq("event_id", ev.id);

    await db.from("events").update({ album_notifie_le: maintenant.toISOString() }).eq("id", ev.id);

    try {
      await envoyer(cle, {
        to: [ADMINISTRATRICE],
        subject: `Album validé : ${ev.name}`,
        html: `
          <div style="font:16px/1.6 -apple-system,sans-serif;color:#3A2E32;max-width:520px;padding:24px">
            <p>Les mariés de <b>${echapper(ev.name)}</b> (${ev.event_date}) ont validé leur album :
            <b>${count ?? "?"} pages</b>.</p>
            <p>Ouvrez la page de composition, puis « Télécharger pour l'impression » :
            les fichiers arrivent numérotés dans l'ordre des pages. Une fois la commande passée
            chez l'imprimeur, cliquez sur « Marquer comme envoyé à l'impression ».</p>
            <p><a href="${SITE}/dashboard/event/${ev.id}/album">${SITE}/dashboard/event/${ev.id}/album</a></p>
          </div>`,
      });
      n += 1;
    } catch (e) {
      console.error("album/notification", ev.id, e);
      // On rend la main : l'alerte repartira à la prochaine heure.
      await db.from("events").update({ album_notifie_le: null }).eq("id", ev.id);
    }
  }
  return n;
}

Deno.serve(async () => {
  try {
    const cle = Deno.env.get("RESEND_API_KEY");
    if (!cle) {
      console.error("mot-de-merci", "RESEND_API_KEY manquante");
      return json({ error: "indisponible" }, 500);
    }
    const maintenant = new Date();
    const liens = await liensDeGalerie(cle, maintenant);
    const albums = await albumsValides(cle, maintenant);
    console.log("envois de l'heure", { liens, albums });
    return json({ ok: true, liens, albums });
  } catch (e) {
    console.error("mot-de-merci", e);
    return json({ error: "indisponible" }, 500);
  }
});
