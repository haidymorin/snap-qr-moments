// Délivre une autorisation d'écriture temporaire sur le stockage Cloudflare R2.
//
// Pourquoi passer par une fonction serveur plutôt que de laisser le navigateur
// parler directement à Cloudflare : les clés R2 permettent d'écrire ET
// d'effacer tout le bucket. Elles ne doivent jamais quitter le serveur. On
// signe donc une adresse valable quelques minutes, pour un seul fichier, et
// c'est cette adresse-là que le navigateur utilise.
//
// Le fichier ne transite pas par nous : il part du téléphone de l'invité
// directement vers Cloudflare. C'est ce qui fait tomber la limite des 50 Mo,
// et ce qui évite de payer deux fois le transfert.
//
// Secrets attendus : R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
//                    R2_BUCKET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//        facultatif : R2_ENDPOINT (voir plus bas — juridiction du bucket)

import { AwsClient } from "npm:aws4fetch@1";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

/* Une heure. L'URL signée doit survivre à l'envoi lui-même : une vidéo de
   plusieurs centaines de Mo depuis le wifi d'une salle de réception peut
   prendre bien plus de cinq minutes. Assez long pour que l'envoi aboutisse,
   assez court pour qu'un lien copié ne serve pas de dépôt public. */
const VALIDITE = 3600;

/* Ce qu'on accepte. La liste est courte volontairement : tout ce qui n'est pas
   une image ou une vidéo n'a rien à faire dans la galerie d'un mariage. */
const TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif",
  "video/mp4", "video/quicktime", "video/webm",
  // Les navigateurs de bureau et les Android anciens déclarent parfois l'un de
  // ces types-là pour une vidéo tout à fait ordinaire. Les refuser ne protège
  // de rien : ce sont les mêmes fichiers, sous un autre nom.
  "video/x-m4v", "video/3gpp", "video/mpeg", "video/x-matroska", "video/x-msvideo",
  // Les messages vocaux du livre d'or. Le format dépend du navigateur : webm
  // sur Android et Chrome, mp4 sur iPhone. On accepte les deux plutôt que
  // d'imposer une conversion que le téléphone ferait mal.
  "audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/aac", "audio/wav",
];

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const { eventId, path, contentType } = await req.json();

    if (!eventId || !path) return json({ error: "requete_incomplete" }, 400);
    if (!TYPES.includes(String(contentType))) return json({ error: "type_refuse" }, 415);

    // Le chemin est imposé par nous, pas par le navigateur : sans cette
    // vérification, n'importe qui pourrait écrire n'importe où dans le bucket,
    // y compris par-dessus les photos d'un autre mariage.
    const attendu = new RegExp(`^${eventId}/[a-f0-9-]{36}(-thumb)?\\.[a-z0-9]{2,5}$`);
    if (!attendu.test(String(path))) return json({ error: "chemin_invalide" }, 400);

    // L'événement doit exister. C'est ce qui empêche de se servir du stockage
    // comme d'un hébergement gratuit pour des fichiers quelconques.
    const { data: evenement } = await db
      .from("events").select("id").eq("id", eventId).maybeSingle();
    if (!evenement) return json({ error: "evenement_inconnu" }, 404);

    const compte = Deno.env.get("R2_ACCOUNT_ID")!;
    const bucket = Deno.env.get("R2_BUCKET")!;

    const client = new AwsClient({
      accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID")!,
      secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY")!,
      service: "s3",
      region: "auto",
    });

    /* Le segment `.eu` n'est pas décoratif : le bucket a été créé sous
       juridiction Union européenne, pour que les photos des invités ne
       quittent pas l'Europe. Cloudflare lui donne alors une adresse distincte,
       et l'adresse sans juridiction désigne un tout autre espace de noms — où
       ce bucket n'existe pas. Signés contre la mauvaise adresse, les envois
       recevaient un 403 sur la requête que le navigateur pose avant tout
       dépôt, sans le moindre en-tête CORS : côté invité, cela ressemblait à
       une coupure de connexion. */
    const racine = Deno.env.get("R2_ENDPOINT")?.replace(/\/$/, "")
      ?? `https://${compte}.eu.r2.cloudflarestorage.com`;
    const cible = `${racine}/${bucket}/${path}`;
    const signee = await client.sign(
      new Request(`${cible}?X-Amz-Expires=${VALIDITE}`, { method: "PUT" }),
      { aws: { signQuery: true } },
    );

    return json({ url: signee.url, expiresIn: VALIDITE });
  } catch (e) {
    console.error("r2-sign-upload", e);
    return json({ error: "indisponible" }, 500);
  }
});
