/**
 * Génère une vignette (poster) JPEG à partir d'une vidéo, côté client.
 * Charge la vidéo dans un élément caché, se place à 0.5s, dessine la frame
 * sur un canvas redimensionné (400px max) et exporte en JPEG q0.7.
 */
export interface VideoPoster {
  thumb: Blob | null;
  duration: number | null;
}

const THUMB_MAX = 400;
const THUMB_QUALITY = 0.7;

export async function generateVideoPoster(file: File): Promise<VideoPoster> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";
  video.src = url;

  try {
    const duration = await new Promise<number>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("timeout")), 15000);
      video.onloadedmetadata = () => {
        clearTimeout(timer);
        resolve(Number.isFinite(video.duration) ? video.duration : 0);
      };
      video.onerror = () => {
        clearTimeout(timer);
        reject(new Error("video decode failed"));
      };
    });

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("seek timeout")), 15000);
      video.onseeked = () => {
        clearTimeout(timer);
        resolve();
      };
      video.onerror = () => {
        clearTimeout(timer);
        reject(new Error("seek failed"));
      };
      video.currentTime = Math.min(0.5, duration > 0 ? duration / 2 : 0.5);
    });

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) throw new Error("no video dimensions");
    const ratio = Math.min(1, THUMB_MAX / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * ratio));
    canvas.height = Math.max(1, Math.round(h * ratio));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const thumb = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", THUMB_QUALITY)
    );
    return { thumb, duration: duration > 0 ? duration : null };
  } catch {
    return { thumb: null, duration: null };
  } finally {
    URL.revokeObjectURL(url);
    video.removeAttribute("src");
  }
}

export function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
