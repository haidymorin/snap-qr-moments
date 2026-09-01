// « Supprimer mon empreinte ».
//
// Le point important tient en une phrase : effacer la ligne en base ne suffit
// pas. Tant que l'empreinte vit dans la collection Rekognition, la personne
// reste reconnaissable — et lui avoir affiché « c'est supprimé » serait un
// mensonge. On supprime donc CHEZ AMAZON D'ABORD, et en base ensuite.
//
// Aucune authentification : l'invité n'a pas de compte. Il prouve son identité
// en présentant le jeton aléatoire déposé dans son navigateur, qui n'ouvre
// l'accès qu'à sa propre ligne.

import { createClient } from "@supabase/supabase-js";
import { RekognitionClient, DeleteFacesCommand } from "@aws-sdk/client-rekognition";

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
);

const rekognition = new RekognitionClient({
  region: "eu-west-1",
  credentials: {
    accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID")!,
    secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY")!,
  },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const { eventId, browserToken } = await req.json();
    if (!eventId || !browserToken) return json({ error: "requete_incomplete" }, 400);

    const { data: consentement } = await db
      .from("face_consents")
      .select("id, rekognition_face_id, event_id")
      .eq("event_id", eventId)
      .eq("browser_token", browserToken)
      .maybeSingle();

    // Rien à supprimer : on répond « c'est fait » plutôt qu'une erreur. Du
    // point de vue de la personne, le résultat est le même, et ça évite de
    // révéler si un jeton correspond à quelque chose.
    if (!consentement) return json({ status: "ok" });

    if (consentement.rekognition_face_id) {
      const { data: etat } = await db
        .from("face_events").select("collection_id").eq("event_id", eventId).maybeSingle();

      if (etat?.collection_id) {
        try {
          await rekognition.send(new DeleteFacesCommand({
            CollectionId: etat.collection_id,
            FaceIds: [consentement.rekognition_face_id],
          }));
        } catch (e) {
          // Si Amazon refuse, on n'efface PAS la ligne : mieux vaut réessayer
          // plus tard que de perdre la trace d'une empreinte encore vivante et
          // de croire, à tort, qu'elle a disparu.
          console.error("face-forget — suppression Rekognition refusée", e);
          return json({ error: "suppression_incomplete" }, 502);
        }
      }
    }

    await db.from("face_consents").delete().eq("id", consentement.id);
    return json({ status: "ok" });
  } catch (e) {
    console.error("face-forget", e);
    return json({ error: "indisponible" }, 500);
  }
});
