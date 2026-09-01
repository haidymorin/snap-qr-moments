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
  };
  return table[type] ?? "bin";
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
    throw new Error(data?.error ?? error?.message ?? "signature refusée");
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
