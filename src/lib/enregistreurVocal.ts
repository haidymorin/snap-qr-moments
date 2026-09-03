/* Enregistrer la voix, dans le navigateur.
 *
 * Le format n'est pas au choix : Chrome et Android donnent du WebM, Safari et
 * l'iPhone du MP4. Convertir de l'un vers l'autre dans un téléphone coûterait
 * plus cher que ça ne rapporte, et raterait une fois sur cinq. On accepte donc
 * ce que l'appareil sait produire, et on le stocke tel quel — les deux formats
 * se lisent partout à la lecture.
 */

const FORMATS = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/aac",
  "audio/ogg;codecs=opus",
];

export const enregistrementDisponible = () =>
  typeof MediaRecorder !== "undefined" &&
  typeof navigator !== "undefined" &&
  !!navigator.mediaDevices?.getUserMedia;

function formatRetenu(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return FORMATS.find((f) => MediaRecorder.isTypeSupported?.(f));
}

/** Le type simple à déclarer au stockage, sans les paramètres de codec. */
export const typeSimple = (mime: string) => mime.split(";")[0] || "audio/webm";

export interface Enregistrement {
  blob: Blob;
  mime: string;
  secondes: number;
}

export interface SessionEnregistrement {
  /** Arrête, libère le micro, et rend le fichier. */
  arreter: () => Promise<Enregistrement>;
  /** Arrête et jette. À appeler si l'invité annule. */
  annuler: () => void;
}

/**
 * Demande le micro et commence à enregistrer.
 * L'appelant reçoit de quoi arrêter ; c'est lui qui tient la durée affichée.
 */
export async function demarrerEnregistrement(): Promise<SessionEnregistrement> {
  const flux = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime = formatRetenu();
  const recorder = new MediaRecorder(flux, mime ? { mimeType: mime } : undefined);
  const morceaux: BlobPart[] = [];
  const debut = Date.now();

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) morceaux.push(e.data);
  };
  recorder.start();

  /* Couper le flux libère le micro et fait disparaître le point rouge du
     téléphone. L'oublier laisserait l'invité croire qu'on l'écoute encore. */
  const couper = () => flux.getTracks().forEach((t) => t.stop());

  return {
    arreter: () =>
      new Promise<Enregistrement>((resolve) => {
        recorder.onstop = () => {
          couper();
          const type = recorder.mimeType || mime || "audio/webm";
          resolve({
            blob: new Blob(morceaux, { type }),
            mime: typeSimple(type),
            secondes: Math.max(1, Math.round((Date.now() - debut) / 1000)),
          });
        };
        recorder.stop();
      }),
    annuler: () => {
      try { recorder.stop(); } catch { /* déjà arrêté */ }
      couper();
    },
  };
}
