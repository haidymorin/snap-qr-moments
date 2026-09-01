// La purge. Passe chaque nuit et supprime ce qui est arrivé à échéance.
//
// C'est la fonction la moins spectaculaire et la plus importante du lot :
// c'est elle qui exécute la promesse écrite dans les conditions de vente.
// Une purge qui ne tourne pas ne se voit pas — jusqu'au jour où quelqu'un
// demande des comptes. Elle doit être testée, et son résultat vérifié.
//
// Elle est appelée par une tâche planifiée, pas par le navigateur : elle exige
// un secret partagé (CLEANUP_SECRET) et refuse tout le reste.

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  RekognitionClient,
  DeleteFacesCommand,
  DeleteCollectionCommand,
} from "npm:@aws-sdk/client-rekognition@3";

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
  if (req.headers.get("x-cleanup-secret") !== Deno.env.get("CLEANUP_SECRET")) {
    return new Response("non", { status: 401 });
  }

  const rapport = { empreintes_supprimees: 0, collections_supprimees: 0, echecs: 0 };

  try {
    // 1. Les empreintes individuelles arrivées à échéance.
    //    La fonction SQL supprime les lignes ET nous rend de quoi faire le
    //    ménage chez Amazon — l'ordre inverse laisserait des empreintes
    //    orphelines, vivantes et introuvables.
    const { data: expirees } = await db.rpc("purge_expired_face_consents");

    const parCollection = new Map<string, string[]>();
    for (const ligne of expirees ?? []) {
      if (!ligne.collection_id || !ligne.rekognition_face_id) continue;
      const liste = parCollection.get(ligne.collection_id) ?? [];
      liste.push(ligne.rekognition_face_id);
      parCollection.set(ligne.collection_id, liste);
    }

    for (const [collection, faceIds] of parCollection) {
      // Rekognition accepte 4096 identifiants par appel ; on reste large.
      for (let i = 0; i < faceIds.length; i += 1000) {
        try {
          await rekognition.send(new DeleteFacesCommand({
            CollectionId: collection, FaceIds: faceIds.slice(i, i + 1000),
          }));
          rapport.empreintes_supprimees += Math.min(1000, faceIds.length - i);
        } catch (e) {
          console.error("purge — empreintes", collection, e);
          rapport.echecs++;
        }
      }
    }

    // 2. Les événements dont la galerie a dépassé six mois : la collection
    //    entière disparaît, visages des photos compris.
    const limite = new Date();
    limite.setMonth(limite.getMonth() - 6);

    const { data: perimes } = await db
      .from("events")
      .select("id, event_date, face_events(collection_id)")
      .lt("event_date", limite.toISOString().slice(0, 10));

    for (const evenement of perimes ?? []) {
      const collection = (evenement as any).face_events?.collection_id;
      if (!collection) continue;
      try {
        await rekognition.send(new DeleteCollectionCommand({ CollectionId: collection }));
        await db.from("face_events").delete().eq("event_id", evenement.id);
        await db.from("photo_faces").delete().eq("event_id", evenement.id);
        await db.from("face_consents").delete().eq("event_id", evenement.id);
        rapport.collections_supprimees++;
      } catch (e) {
        console.error("purge — collection", collection, e);
        rapport.echecs++;
      }
    }

    console.log("purge", rapport);
    return new Response(JSON.stringify(rapport), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("face-cleanup", e);
    return new Response(JSON.stringify({ error: String(e), rapport }), { status: 500 });
  }
});
