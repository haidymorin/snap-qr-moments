// La purge. Passe chaque nuit et supprime ce qui est arrivé à échéance.
//
// C'est la fonction la moins spectaculaire et la plus importante du lot :
// c'est elle qui exécute la promesse écrite dans les conditions de vente.
// Une purge qui ne tourne pas ne se voit pas — jusqu'au jour où quelqu'un
// demande des comptes. Elle doit être testée, et son résultat vérifié.
//
// Elle est appelée par une tâche planifiée, pas par le navigateur : elle exige
// la clé de service, que la base lit dans son coffre, et refuse tout le reste.

import { createClient } from "@supabase/supabase-js";
/* Sans cet import, `AwsClient` plus bas lève une ReferenceError au chargement
   du module : la fonction échouait avant même de lire le secret, donc la purge
   des échéances n'a jamais pu s'exécuter. */
import { AwsClient } from "aws4fetch";
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

/* Qui a le droit de déclencher la purge.
 *
 * La purge efface pour de bon : elle ne doit jamais pouvoir être déclenchée
 * depuis un navigateur. La passerelle vérifie déjà la signature du jeton,
 * mais le jeton anonyme est public — il est écrit dans le code du site. Il
 * faut donc la clé de service, celle que la tâche planifiée lit dans le
 * coffre de la base et n'écrit nulle part.
 *
 * Deux portes, une seule suffit :
 *  - le porteur est exactement la clé de service (la tâche planifiée) ;
 *  - le jeton porte le rôle `service_role` (même clé, format jeton — la
 *    signature a déjà été vérifiée par la passerelle en amont) ;
 *  - à défaut, l'ancien secret partagé, s'il a été configuré un jour.
 */
function roleDuJeton(porteur: string): string | null {
  const corps = porteur.split(".")[1];
  if (!corps) return null;
  try {
    const clair = atob(corps.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(clair).role ?? null;
  } catch {
    return null;
  }
}

function autorise(req: Request): boolean {
  const porteur = (req.headers.get("Authorization") ?? "")
    .replace(/^Bearer\s+/i, "")
    .trim();

  const cleDeService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (porteur && cleDeService && porteur === cleDeService) return true;
  if (porteur && roleDuJeton(porteur) === "service_role") return true;

  const secret = Deno.env.get("CLEANUP_SECRET");
  if (secret && req.headers.get("x-cleanup-secret") === secret) return true;

  return false;
}

/** Ce que la purge a effacé pendant une exécution. */
type Rapport = {
  empreintes_supprimees: number;
  collections_supprimees: number;
  fichiers_supprimes: number;
  echecs: number;
};

/* Écrit une ligne dans le journal des purges.
 *
 * Les journaux techniques ne remontent qu'à quelques heures : sans cette
 * table, personne ne peut dire, trois mois plus tard, si la purge du 12 mars
 * a bien eu lieu. C'est la preuve que la promesse des conditions de vente est
 * tenue. Un échec d'écriture ne doit jamais faire échouer la purge
 * elle-même : le ménage compte plus que son compte rendu.
 */
async function journaliser(rapport: Rapport, erreur: string | null) {
  try {
    await db.from("journal_purge").insert({
      empreintes_supprimees: rapport.empreintes_supprimees,
      collections_supprimees: rapport.collections_supprimees,
      fichiers_supprimes: rapport.fichiers_supprimes,
      echecs: rapport.echecs,
      erreur,
    });
  } catch (e) {
    console.error("purge — journal", e);
  }
}

Deno.serve(async (req) => {
  if (!autorise(req)) {
    return new Response("non", { status: 401 });
  }

  const rapport: Rapport = {
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
    await journaliser(rapport, null);
    return new Response(JSON.stringify(rapport), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("face-cleanup", e);
    await journaliser(rapport, String(e));
    return new Response(JSON.stringify({ error: String(e), rapport }), { status: 500 });
  }
});
