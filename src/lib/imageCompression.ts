export interface CompressedImage {
  /** Version "full" : plus grand côté max 2560px, JPEG q0.82 */
  full: Blob;
  /** Miniature : plus grand côté max 400px, JPEG q0.7 (null si non décodable) */
  thumb: Blob | null;
  /** true si le navigateur n'a pas pu décoder l'image (HEIC iPhone, etc.) */
  fallback: boolean;
}

const FULL_MAX = 2560;
const FULL_QUALITY = 0.82;
const THUMB_MAX = 400;
const THUMB_QUALITY = 0.7;

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    return await createImageBitmap(file);
  }
  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode failed"));
    };
    img.src = url;
  });
}

function resizeTo(
  source: ImageBitmap | HTMLImageElement,
  maxSide: number,
  quality: number
): Promise<Blob> {
  const w = "width" in source ? source.width : 0;
  const h = "height" in source ? source.height : 0;
  const ratio = Math.min(1, maxSide / Math.max(w, h));
  const targetW = Math.max(1, Math.round(w * ratio));
  const targetH = Math.max(1, Math.round(h * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("no 2d context"));
  ctx.drawImage(source as CanvasImageSource, 0, 0, targetW, targetH);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      quality
    );
  });
}

/**
 * Compresse une image côté client. En cas d'échec de décodage
 * (HEIC iPhone par exemple), renvoie le fichier original sans miniature.
 */
export async function compressImage(file: File): Promise<CompressedImage> {
  try {
    const source = await decode(file);
    const full = await resizeTo(source, FULL_MAX, FULL_QUALITY);
    const thumb = await resizeTo(source, THUMB_MAX, THUMB_QUALITY);
    if ("close" in source && typeof source.close === "function") source.close();
    return { full, thumb, fallback: false };
  } catch {
    return { full: file, thumb: null, fallback: true };
  }
}
