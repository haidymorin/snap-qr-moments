import { supabase } from "@/integrations/supabase/client";

/* Le stockage des photos et vidéos, côté navigateur.
 *
 * Les fichiers ne vivent plus dans le stockage de Lovable mais sur Cloudflare
 * R2. Deux raisons, et la seconde est la plus importante :
 *
 *   1. La sortie de données y est gratuite, quel que soit le volume. Une
 *      galerie consultée par 250 invités ne coûte rien. Chez la plupart des
 *      autres, c'est le poste qui explose.
 *   2. Le coût est calculable à l'avance — 0,015 $ le Go par mois, 10 Go
 *      offerts en permanence. Sur un modèle où le technique doit rester sous
 *      1 % du chiffre d'affaires, savoir compter est une condition, pas un
 *      confort.
 *
 * Le fichier part du téléphone directement vers Cloudflare, sans passer par
 * nos serveurs : c'est ce qui fait tomber la limite de taille, et ce qui évite
 * de payer deux fois le même transfert.
 */

/** L'adresse publique du bucket. Un domaine à toi plus tard, r2.dev en attendant. */
const BASE_PUBLIQUE = (import.meta.env.VITE_R2_PUBLIC_URL as string | undefined)?.replace(/\/$/, "");

export const r2Configure = () => Boolean(BASE_PUBLIQUE);

/** L'adresse publique d'un fichier, à partir de son chemin dans le bucket. */
export const r2Url = (chemin: string) => `${BASE_PUBLIQUE}/${chemin}`;

/** L'extension à donner au fichier, déduite de son type déclaré. */
export function extensionDe(type: string): string {
  const table: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
    "video/x-m4v": "m4v",
    "video/3gpp": "3gp",
    "video/mpeg": "mpeg",
    "video/x-matroska": "mkv",
    "video/x-msvideo": "avi",
  };
  return table[type] ?? "bin";
}

/* Le type du fichier, tel que le navigateur le déclare — ou, à défaut, celui
 * que dit l'extension du nom.
 *
 * Tous les navigateurs ne remplissent pas `file.type`. Certains rendent une
 * chaîne vide, d'autres un type qu'on ne connaît pas. Le fichier était alors
 * refusé au moment de la signature, et l'invité n'avait aucun moyen de
 * comprendre pourquoi : c'est le nom du fichier qui tranche en dernier
 * recours. */
const EXTENSION_VERS_TYPE: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  heic: "image/heic", heif: "image/heif",
  mov: "video/quicktime", mp4: "video/mp4", m4v: "video/x-m4v",
  webm: "video/webm", "3gp": "video/3gpp", mkv: "video/x-matroska",
  avi: "video/x-msvideo", mpeg: "video/mpeg", mpg: "video/mpeg",
};

export function typeDeclare(file: File, defaut: string): string {
  if (file.type && extensionDe(file.type) !== "bin") return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_VERS_TYPE[ext] ?? file.type ?? defaut;
}

/* Pourquoi cette fonction existe : `functions.invoke` ne rend pas le corps des
 * réponses d'erreur, seulement « Edge Function returned a non-2xx status
 * code ». Aucune ligne ne savait traduire cette phrase, si bien qu'un fichier
 * refusé pour son format s'affichait comme « connexion interrompue » — et
 * l'invité réessayait indéfiniment un envoi qui ne pouvait pas aboutir. Le
 * motif exact est dans le corps de la réponse ; on va le chercher. */
async function motifDeSignature(data: unknown, error: unknown): Promise<string> {
  const direct = (data as { error?: string } | null)?.error;
  if (direct) return direct;

  const contexte = (error as { context?: unknown } | null)?.context;
  if (contexte instanceof Response) {
    try {
      const corps = await contexte.clone().json();
      if (corps?.error) return `${corps.error} (${contexte.status})`;
    } catch {
      /* Corps illisible : le statut reste plus parlant que rien. */
    }
    return `(${contexte.status})`;
  }
  return (error as { message?: string } | null)?.message ?? "refusée";
}

export interface EnvoiR2 {
  eventId: string;
  /** Chemin dans le bucket : `<eventId>/<uuid>.<ext>`, imposé côté serveur. */
  chemin: string;
  fichier: Blob;
  contentType: string;
  onProgress?: (part: number) => void;
  signal?: AbortSignal;
}

/**
 * Envoie un fichier sur R2 et renvoie son adresse publique.
 *
 * On passe par XMLHttpRequest et non par fetch : c'est la seule interface du
 * navigateur qui remonte la progression de l'envoi. Sans elle, l'invité qui
 * dépose une vidéo de 200 Mo sur le réseau d'une salle de réception voit un
 * écran figé et ferme la page.
 */
export async function envoyerSurR2({
  eventId, chemin, fichier, contentType, onProgress, signal,
}: EnvoiR2): Promise<string> {
  const { data, error } = await supabase.functions.invoke("r2-sign-upload", {
    body: { eventId, path: chemin, contentType },
  });
  if (error || !data?.url) {
    throw new Error(`signature ${await motifDeSignature(data, error)}`);
  }

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", data.url as string, true);
    xhr.setRequestHeader("Content-Type", contentType);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(1);
        resolve();
      } else {
        // Le corps de la réponse de Cloudflare est du XML : on le transmet tel
        // quel, la traduction en français lisible se fait plus haut.
        reject(new Error(xhr.responseText || `upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("network"));
    xhr.onabort = () => reject(new Error("aborted"));
    signal?.addEventListener("abort", () => xhr.abort());

    xhr.send(fichier);
  });

  return r2Url(chemin);
}
