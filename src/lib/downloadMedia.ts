import { saveAs } from "file-saver";

/* Enregistrer une photo depuis un téléphone.
 *
 * Un site web n'a pas le droit d'écrire dans la photothèque : seule une
 * application installée le peut. Le chemin le plus court vers « Enregistrer
 * dans mes photos » est la feuille de partage du système, que l'on ouvre avec
 * navigator.share. Sur ordinateur, ou si le partage de fichiers n'est pas
 * disponible, on retombe sur un téléchargement classique.
 */
export type DownloadOutcome = "shared" | "downloaded" | "cancelled";

export async function downloadMedia(url: string, fileName?: string | null): Promise<DownloadOutcome> {
  const safeName = (fileName || "").trim() || "photo.jpg";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed (${res.status})`);
  const blob = await res.blob();

  const file = new File([blob], safeName, { type: blob.type || "image/jpeg" });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };

  if (typeof nav.share === "function" && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file] });
      return "shared";
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") return "cancelled";
      // Partage refusé par le système : on tente le téléchargement.
    }
  }

  saveAs(blob, safeName);
  return "downloaded";
}
