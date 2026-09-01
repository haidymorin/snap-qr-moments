// Reconnaissance faciale — la fonction qui reçoit un selfie et renvoie les
// photos où la personne apparaît.
//
// Secrets attendus : AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Trois principes qui gouvernent tout ce fichier :
//
//   1. LE SELFIE N'EST JAMAIS ÉCRIT NULLE PART. Il arrive en mémoire, sert à
//      produire une empreinte, et disparaît avec la requête. Aucun disque,
//      aucun bucket, aucun journal.
//   2. RIEN N'EST ANALYSÉ TANT QUE PERSONNE NE DEMANDE. La collection d'un
//      événement n'existe qu'à partir de la première demande d'un invité.
//   3. L'ANALYSE SE FAIT PAR LOTS. Une fonction serveur a quelques dizaines de
//      secondes à vivre ; neuf cents photos n'y tiennent pas. On en traite un
//      lot, on renvoie la progression, le navigateur rappelle. C'est aussi ce
//      qui permet d'afficher « 340 photos sur 900 » plutôt qu'une roue qui
//      tourne dans le vide.

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  RekognitionClient,
  CreateCollectionCommand,
  IndexFacesCommand,
  SearchFacesCommand,
  DeleteFacesCommand,
} from "npm:@aws-sdk/client-rekognition@3";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Dublin. Rekognition n'existe pas à Paris — voir la spec, §1. */
const REGION = "eu-west-1";

/** Combien de photos par appel. Au-delà, on risque le délai d'expiration. */
const LOT = 40;

/** Une empreinte qui ne sert plus disparaît au bout de 90 jours. */
const JOURS_SANS_HOTES = 90;

/** Seuil de ressemblance. En dessous, on préfère ne rien montrer qu'un inconnu. */
const SIMILARITE_MIN = 92;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const rekognition = new RekognitionClient({
  region: REGION,
  credentials: {
    accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID")!,
    secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY")!,
  },
});

/** Récupère une photo du stockage, réduite : Rekognition plafonne à 5 Mo. */
async function telecharger(storagePath: string): Promise<Uint8Array | null> {
  const { data, error } = await db.storage
    .from("event-photos")
    .download(storagePath, { transform: { width: 1600, quality: 80 } });

  if (error || !data) {
    // La transformation d'image n'est pas disponible sur tous les plans :
    // on retombe sur le fichier d'origine plutôt que d'abandonner la photo.
    const brut = await db.storage.from("event-photos").download(storagePath);
    if (brut.error || !brut.data) return null;
    const buf = new Uint8Array(await brut.data.arrayBuffer());
    return buf.byteLength > 5_000_000 ? null : buf;
  }
  return new Uint8Array(await data.arrayBuffer());
}

/** Marque une photo comme analysée, quel qu'ait été le résultat. */
async function marquerVue(photoId: string) {
  await db.from("photos")
    .update({ faces_indexed_at: new Date().toISOString() })
    .eq("id", photoId);
}

/** Analyse un lot de photos pas encore vues. Renvoie combien ont été traitées. */
async function analyserUnLot(eventId: string, collectionId: string): Promise<number> {
  const { data: photos } = await db
    .from("photos")
    .select("id, storage_path")
    .eq("event_id", eventId)
    .is("faces_indexed_at", null)
    .limit(LOT);

  if (!photos?.length) return 0;

  let traitees = 0;
  for (const photo of photos) {
    try {
      const octets = await telecharger(photo.storage_path);
      if (!octets) {
        // Photo illisible ou trop lourde : on la marque comme vue pour ne pas
        // la reprendre en boucle à chaque appel.
        await marquerVue(photo.id);
        traitees++;
        continue;
      }

      const res = await rekognition.send(new IndexFacesCommand({
        CollectionId: collectionId,
        Image: { Bytes: octets },
        ExternalImageId: photo.id,
        DetectionAttributes: [],
        MaxFaces: 20,
        QualityFilter: "AUTO",
      }));

      const lignes = (res.FaceRecords ?? [])
        .map((f) => f.Face?.FaceId)
        .filter((id): id is string => Boolean(id))
        .map((faceId) => ({ photo_id: photo.id, event_id: eventId, rekognition_face_id: faceId }));

      if (lignes.length) {
        await db.from("photo_faces").upsert(lignes, { onConflict: "photo_id,rekognition_face_id" });
      }
      // Une photo sans aucun visage est quand même marquée : elle ne doit pas
      // revenir dans le lot suivant.
      await marquerVue(photo.id);
      traitees++;
    } catch (_e) {
      // Une photo qui fait échouer Rekognition ne doit pas bloquer les 899
      // autres. On la marque et on continue.
      await marquerVue(photo.id);
      traitees++;
    }
  }
  return traitees;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const { eventId, browserToken, firstName, consent, allowHosts, selfieBase64 } =
      await req.json();

    // --- Les refus, avant toute dépense ---------------------------------
    if (!consent) {
      return json({ error: "consentement_requis" }, 400);
    }
    if (!eventId || !browserToken) {
      return json({ error: "requete_incomplete" }, 400);
    }

    const { data: evenement } = await db
      .from("events").select("id").eq("id", eventId).maybeSingle();
    if (!evenement) return json({ error: "evenement_inconnu" }, 404);

    // --- L'état de l'événement ------------------------------------------
    let { data: etat } = await db
      .from("face_events").select("*").eq("event_id", eventId).maybeSingle();

    if (!etat) {
      const collectionId = `qrm-${eventId}`;
      try {
        await rekognition.send(new CreateCollectionCommand({ CollectionId: collectionId }));
      } catch (e) {
        // Déjà créée lors d'un appel concurrent : ce n'est pas une erreur.
        if ((e as Error).name !== "ResourceAlreadyExistsException") throw e;
      }
      const { count } = await db
        .from("photos").select("id", { count: "exact", head: true }).eq("event_id", eventId);

      const { data: cree } = await db.from("face_events").insert({
        event_id: eventId,
        status: "en_cours",
        collection_id: collectionId,
        total_photos: count ?? 0,
        activated_at: new Date().toISOString(),
      }).select().single();
      etat = cree;
    }

    const collectionId = etat!.collection_id as string;

    // --- L'analyse, par lots ---------------------------------------------
    // On regarde toujours s'il reste des photos non analysées, y compris quand
    // l'événement est déjà « actif » : c'est ce qui rattrape les photos
    // déposées après la première recherche. Une photo arrivée jeudi est ainsi
    // retrouvée par une recherche faite vendredi, sans fonction supplémentaire
    // ni déclencheur à maintenir.
    {
      const faites = await analyserUnLot(eventId, collectionId);
      const { count: vues } = await db
        .from("photos").select("id", { count: "exact", head: true })
        .eq("event_id", eventId).not("faces_indexed_at", "is", null);
      const { count: total } = await db
        .from("photos").select("id", { count: "exact", head: true }).eq("event_id", eventId);

      const fini = faites === 0;
      await db.from("face_events").update({
        status: fini ? "actif" : "en_cours",
        indexed_photos: vues ?? 0,
        total_photos: total ?? 0,
        updated_at: new Date().toISOString(),
      }).eq("event_id", eventId);

      if (!fini) {
        // On rend la main : le navigateur rappellera, et affichera la
        // progression réelle en attendant. Le selfie n'a même pas été lu.
        return json({
          status: "analyse_en_cours",
          analysees: vues ?? 0,
          total: total ?? 0,
        });
      }
    }

    // --- Le selfie --------------------------------------------------------
    if (!selfieBase64) return json({ error: "selfie_manquant" }, 400);

    const selfie = Uint8Array.from(atob(String(selfieBase64).split(",").pop() ?? ""), (c) =>
      c.charCodeAt(0),
    );

    let indexation;
    try {
      indexation = await rekognition.send(new IndexFacesCommand({
        CollectionId: collectionId,
        Image: { Bytes: selfie },
        ExternalImageId: `invite-${browserToken.slice(0, 40)}`,
        MaxFaces: 2,
        QualityFilter: "AUTO",
      }));
    } catch (_e) {
      return json({ error: "selfie_illisible" }, 422);
    }

    const visages = indexation.FaceRecords ?? [];
    if (visages.length === 0) return json({ error: "aucun_visage" }, 422);
    if (visages.length > 1) {
      // Plusieurs personnes sur le selfie : on ne devine pas laquelle est
      // l'invité, et on ne garde surtout pas l'empreinte d'un tiers.
      const aSupprimer = visages.map((v) => v.Face?.FaceId).filter(Boolean) as string[];
      await rekognition.send(new DeleteFacesCommand({
        CollectionId: collectionId, FaceIds: aSupprimer,
      }));
      return json({ error: "plusieurs_visages" }, 422);
    }

    const faceId = visages[0].Face!.FaceId!;

    // --- La recherche ------------------------------------------------------
    const correspondances = await rekognition.send(new SearchFacesCommand({
      CollectionId: collectionId,
      FaceId: faceId,
      FaceMatchThreshold: SIMILARITE_MIN,
      MaxFaces: 500,
    }));

    const idsTrouves = (correspondances.FaceMatches ?? [])
      .map((m) => m.Face?.FaceId)
      .filter((id): id is string => Boolean(id));

    let photoIds: string[] = [];
    // On renvoie les lignes complètes, pas seulement les identifiants : la
    // galerie en fait un onglet à part entière, et un aller-retour de moins
    // sur le réseau d'une salle de réception est toujours bon à prendre.
    let photos: unknown[] = [];
    if (idsTrouves.length) {
      const { data: liens } = await db
        .from("photo_faces").select("photo_id")
        .eq("event_id", eventId)
        .in("rekognition_face_id", idsTrouves);
      photoIds = [...new Set((liens ?? []).map((l) => l.photo_id as string))];

      if (photoIds.length) {
        const { data: lignes } = await db
          .from("photos")
          .select("id, url, thumbnail_url, file_name, media_type")
          .in("id", photoIds)
          .order("uploaded_at", { ascending: false });
        photos = lignes ?? [];
      }
    }

    // --- Le consentement ---------------------------------------------------
    // Deux durées, selon la finalité acceptée. Celui qui autorise les mariés
    // sait que son empreinte vivra jusqu'à la fin de la galerie ; les autres
    // voient la leur disparaître au bout de 90 jours.
    const expire = new Date();
    if (allowHosts) expire.setMonth(expire.getMonth() + 6);
    else expire.setDate(expire.getDate() + JOURS_SANS_HOTES);

    await db.from("face_consents").upsert({
      event_id: eventId,
      browser_token: browserToken,
      first_name: String(firstName ?? "").trim().slice(0, 60) || "Invité",
      allow_hosts: Boolean(allowHosts),
      rekognition_face_id: faceId,
      last_used_at: new Date().toISOString(),
      expires_at: expire.toISOString(),
    }, { onConflict: "event_id,browser_token" });

    return json({ status: "ok", photoIds, photos, count: photoIds.length });
  } catch (e) {
    console.error("face-search", e);
    return json({ error: "indisponible" }, 500);
  }
});
