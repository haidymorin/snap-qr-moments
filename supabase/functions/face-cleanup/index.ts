// La purge. Passe chaque nuit et supprime ce qui est arrivé à échéance.
//
// C'est la fonction la moins spectaculaire et la plus importante du lot :
// c'est elle qui exécute la promesse écrite dans les conditions de vente.
// Une purge qui ne tourne pas ne se voit pas — jusqu'au jour où quelqu'un
// demande des comptes. Elle doit être testée, et son résultat vérifié.
//
// Elle est appelée par une tâche planifiée, pas par le navigateur : elle exige
// un secret partagé (CLEANUP_SECRET) et refuse tout le reste.

import { createClient } from "@supabase/supabase-js";
import {
  RekognitionClient,
  DeleteFacesCommand,
  DeleteCollectionCommand,
} from "@aws-sdk/client-rekognition";

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

/* Cloudflare R2. Les fichiers doivent disparaître avec la galerie : supprimer
   les lignes en base en laissant les photos sur le stockage reviendrait à
   facturer indéfiniment des images que plus personne ne peut voir — et à ne
   pas tenir la promesse écrite dans les conditions de vente. */
const r2 = new AwsClient({
  accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID") ?? "",
  secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY") ?? "",
  service: "s3",
  region: "auto",
});
/* L'adresse S3 du bucket.
 *
 * Le segment `.eu` n'est pas décoratif : le bucket a été créé sous juridiction
 * Union européenne, pour que les photos des invités ne quittent pas l'Europe.
 * Cloudflare donne alors à ce bucket une adresse distincte,
 * `<compte>.eu.r2.cloudflarestorage.com`, et l'adresse sans juridiction
 * désigne un tout autre espace de noms — où ce bucket n'existe pas. Les envois
 * signés contre la mauvaise adresse recevaient un 403 sur la requête que le
 * navigateur pose avant tout dépôt, sans le moindre en-tête CORS : côté
 * invité, cela ressemblait à une coupure de connexion.
 *
 * `R2_ENDPOINT` permet de forcer une autre adresse si la juridiction change un
 * jour, sans toucher au code. */
const R2_RACINE = Deno.env.get("R2_ENDPOINT")?.replace(/\/$/, "")
  ?? `https://${Deno.env.get("R2_ACCOUNT_ID")}.eu.r2.cloudflarestorage.com`;
const R2_BASE = `${R2_RACINE}/${Deno.env.get("R2_BUCKET")}`;

/** Supprime un fichier du bucket. Silencieux : un fichier déjà absent va bien. */
async function supprimerSurR2(chemin: string): Promise<boolean> {
  if (!Deno.env.get("R2_ACCOUNT_ID")) return false;
  try {
    const rep = await r2.fetch(`${R2_BASE}/${chemin}`, { method: "DELETE" });
    return rep.ok || rep.status === 404;
  } catch (e) {
    console.error("purge — fichier R2", chemin, e);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.headers.get("x-cleanup-secret") !== Deno.env.get("CLEANUP_SECRET")) {
    return new Response("non", { status: 401 });
  }

  const rapport = {
    empreintes_supprimees: 0,
    collections_supprimees: 0,
    fichiers_supprimes: 0,
    echecs: 0,
  };

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

        // Les fichiers eux-mêmes, image et vignette, avant les lignes en base :
        // une fois la ligne supprimée, on ne saurait plus quel fichier effacer.
        const { data: fichiers } = await db
          .from("photos").select("id, storage_path").eq("event_id", evenement.id);
        for (const f of fichiers ?? []) {
          if (!f.storage_path) continue;
          if (await supprimerSurR2(f.storage_path)) rapport.fichiers_supprimes++;
          const vignette = String(f.storage_path).replace(/\.[a-z0-9]+$/i, "-thumb.jpg");
          await supprimerSurR2(vignette);
        }

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
