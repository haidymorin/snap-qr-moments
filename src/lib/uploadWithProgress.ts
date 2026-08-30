import { supabase } from "@/integrations/supabase/client";

/* Envoi d'un fichier volumineux avec une progression réelle.
 *
 * Le client Supabase envoie très bien les petits fichiers, mais il ne dit rien
 * pendant l'envoi. Pour une vidéo de plusieurs centaines de méga-octets sur le
 * réseau d'une salle de réception, l'invité a besoin de voir avancer une barre,
 * sinon il croit que c'est cassé et il ferme la page.
 *
 * On passe donc par XMLHttpRequest, la seule interface du navigateur qui
 * remonte la progression de l'envoi.
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export interface UploadOptions {
  bucket: string;
  path: string;
  file: File | Blob;
  contentType?: string;
  onProgress?: (ratio: number) => void;
  signal?: AbortSignal;
}

export function uploadWithProgress({
  bucket,
  path,
  file,
  contentType,
  onProgress,
  signal,
}: UploadOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, true);
    xhr.setRequestHeader("apikey", SUPABASE_KEY);
    xhr.setRequestHeader("Content-Type", contentType || (file as File).type || "application/octet-stream");
    xhr.setRequestHeader("x-upsert", "false");

    // Un invité n'est pas connecté : on envoie la clé publique. Si un hôte
    // connecté envoie depuis son tableau de bord, on utilise sa session.
    supabase.auth
      .getSession()
      .then(({ data }) => {
        xhr.setRequestHeader("Authorization", `Bearer ${data.session?.access_token ?? SUPABASE_KEY}`);
        xhr.send(file);
      })
      .catch(() => {
        xhr.setRequestHeader("Authorization", `Bearer ${SUPABASE_KEY}`);
        xhr.send(file);
      });

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(1);
        resolve();
      } else {
        reject(new Error(xhr.responseText || `upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("network"));
    xhr.onabort = () => reject(new Error("aborted"));

    signal?.addEventListener("abort", () => xhr.abort());
  });
}
