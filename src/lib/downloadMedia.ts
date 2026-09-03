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

/* Enregistrer plusieurs fichiers d'un coup, dans la pellicule.
 *
 * C'est le point où une archive `.zip` trahit l'utilisateur : sur téléphone
 * elle n'arrive pas dans la photothèque mais dans l'application Fichiers, et
 * il faut ensuite la décompresser, sélectionner les photos, puis les
 * enregistrer. Quatre gestes que personne ne fait.
 *
 * La feuille de partage du système, elle, accepte plusieurs fichiers et les
 * dépose directement dans la pellicule. Elle a ses limites — quelques dizaines
 * de fichiers, pas des centaines — d'où le plafond ci-dessous : au-delà,
 * l'archive redevient le bon outil, et c'est l'ordinateur qui convient.
 */
export const PARTAGE_MAX = 30;

export function partageMultipleDisponible(): boolean {
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (typeof nav.share !== "function" || typeof nav.canShare !== "function") return false;
  // Un fichier factice suffit à savoir si le système accepte le partage de fichiers.
  const sonde = new File([new Blob(["x"])], "sonde.jpg", { type: "image/jpeg" });
  try {
    return nav.canShare({ files: [sonde] });
  } catch {
    return false;
  }
}

export async function partagerPlusieurs(
  fichiers: { url: string; nom: string }[],
  onProgress?: (faits: number, total: number) => void,
): Promise<DownloadOutcome> {
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  const charges: File[] = [];

  for (const f of fichiers) {
    try {
      const res = await fetch(f.url);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      charges.push(new File([blob], f.nom || "photo.jpg", { type: blob.type || "image/jpeg" }));
    } catch {
      /* Un fichier manquant ne doit pas annuler les autres. */
    }
    onProgress?.(charges.length, fichiers.length);
  }

  if (charges.length === 0) throw new Error("aucun fichier récupéré");
  if (!nav.canShare?.({ files: charges })) throw new Error("partage refusé");

  try {
    await nav.share({ files: charges });
    return "shared";
  } catch (err) {
    if ((err as DOMException)?.name === "AbortError") return "cancelled";
    throw err;
  }
}
