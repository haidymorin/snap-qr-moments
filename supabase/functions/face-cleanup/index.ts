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

/** Le chemin dans le bucket, à partir d'une adresse publique complète.
 *
 * Le livre d'or stocke des URL, pas des chemins : sans cette conversion, on
 * signerait une suppression sur une adresse qui n'existe pas côté S3. */
function cheminR2(adresse: string | null | undefined): string | null {
  if (!adresse) return null;
  try {
    return new URL(adresse).pathname.replace(/^\//, "") || null;
  } catch {
    return adresse.replace(/^\//, "") || null;
  }
}

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
  evenements_purges: number;
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
      evenements_purges: rapport.evenements_purges,
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
    evenements_purges: 0,
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

    // 2. Les galeries fermées : tout ce que l'événement a produit disparaît.
    //
    //    Trois règles apprises en testant la purge pour de vrai :
    //
    //    — C'est la date de FERMETURE de la galerie qui fait foi (expire_le),
    //      pas la date du mariage. Ce sont deux dates différentes, et c'est la
    //      première que les conditions de vente promettent. Si elle manque, on
    //      retombe sur six mois après la date de l'événement.
    //
    //    — Un événement sans reconnaissance faciale doit être purgé comme les
    //      autres. L'ancienne version passait son chemin faute de collection :
    //      ses photos seraient restées indéfiniment, ce qui est le cas le plus
    //      courant et le manquement le plus grave.
    //
    //    — Effacer les fichiers ne suffit pas. Les lignes en base, le livre
    //      d'or et les adresses des invités doivent partir aussi : sinon la
    //      galerie continue d'afficher un album d'images cassées, et des
    //      données personnelles survivent à leur propre suppression.
    const limite = new Date();
    limite.setMonth(limite.getMonth() - 6);
    const limiteEvenement = limite.toISOString().slice(0, 10);
    const aujourdhui = new Date().toISOString().slice(0, 10);

    const { data: perimes } = await db
      .from("events")
      .select("id, expire_le, event_date, face_events(collection_id)")
      .or(
        `expire_le.lte.${aujourdhui},` +
        `and(expire_le.is.null,event_date.lt.${limiteEvenement})`,
      );

    for (const evenement of perimes ?? []) {
      const collection = (evenement as any).face_events?.collection_id;
      try {
        // La collection de visages, quand l'événement en avait une.
        if (collection) {
          try {
            await rekognition.send(new DeleteCollectionCommand({ CollectionId: collection }));
          } catch (e) {
            // Une collection déjà absente n'est pas un échec : le but est
            // qu'elle n'existe plus, et c'est le cas.
            const nom = (e as { name?: string }).name ?? "";
            if (nom !== "ResourceNotFoundException") throw e;
          }
          rapport.collections_supprimees++;
        }

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

        // Le livre d'or garde des voix et des photos jointes : ce sont des
        // fichiers comme les autres, et ils sont au moins aussi personnels.
        const { data: mots } = await db
          .from("livre_dor")
          .select("audio_url, photo_url, photo_thumb_url")
          .eq("event_id", evenement.id);
        for (const m of mots ?? []) {
          for (const adresse of [m.audio_url, m.photo_url, m.photo_thumb_url]) {
            const chemin = cheminR2(adresse);
            if (chemin && await supprimerSurR2(chemin)) rapport.fichiers_supprimes++;
          }
        }

        // Puis les lignes. L'événement lui-même reste : il porte la commande et
        // la facture, qui relèvent de la comptabilité, pas des données des
        // invités. Tout ce que les invités ont déposé, lui, s'en va.
        await db.from("album_pages").delete().eq("event_id", evenement.id);
        await db.from("livre_dor").delete().eq("event_id", evenement.id);
        await db.from("guest_contacts").delete().eq("event_id", evenement.id);
        await db.from("photos").delete().eq("event_id", evenement.id);
        await db.from("face_events").delete().eq("event_id", evenement.id);
        await db.from("photo_faces").delete().eq("event_id", evenement.id);
        await db.from("face_consents").delete().eq("event_id", evenement.id);

        // La galerie est fermée pour de bon : l'état le dit, et la date de
        // purge reste comme preuve.
        await db.from("events")
          .update({ statut: "expire", purge_le: new Date().toISOString() })
          .eq("id", evenement.id);

        rapport.evenements_purges++;
      } catch (e) {
        console.error("purge — événement", evenement.id, e);
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
