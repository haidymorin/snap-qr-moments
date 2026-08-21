import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { compressImage } from "@/lib/imageCompression";
import { generateVideoPoster } from "@/lib/videoPoster";
import MediaTabs, { MediaFilter, PlayOverlay } from "@/components/MediaTabs";
import { Calendar, Camera, Check, Loader2, X } from "lucide-react";

interface EventRow {
  id: string;
  name: string;
  event_date: string;
  event_type: string;
}
interface MediaRow {
  id: string;
  url: string;
  thumbnail_url: string | null;
  file_name: string;
  media_type: string;
}

const MAX_IMAGE_SIZE = 25 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const PAGE_SIZE = 24;
const CONCURRENCY = 3;

const GuestEvent = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [event, setEvent] = useState<EventRow | null>(null);
  const [media, setMedia] = useState<MediaRow[]>([]);
  const [filter, setFilter] = useState<MediaFilter>("all");
  const [counts, setCounts] = useState({ all: 0, photo: 0, video: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [phase, setPhase] = useState<"idle" | "compressing" | "uploading">("idle");
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successText, setSuccessText] = useState("");
  const [lightbox, setLightbox] = useState<MediaRow | null>(null);

  const fetchPage = useCallback(
    async (from: number, activeFilter: MediaFilter) => {
      if (!id) return [] as MediaRow[];
      const { data } = await supabase.rpc("guest_list_media", {
        p_event_id: id,
        p_media: activeFilter,
        p_limit: PAGE_SIZE,
        p_offset: from,
      });
      const rows = (data ?? []) as MediaRow[];
      setHasMore(rows.length === PAGE_SIZE);
      return rows;
    },
    [id]
  );

  const loadCounts = useCallback(async () => {
    if (!id) return;
    const [photoRes, videoRes] = await Promise.all([
      supabase.from("photos").select("id", { count: "exact", head: true }).eq("event_id", id).eq("media_type", "photo"),
      supabase.from("photos").select("id", { count: "exact", head: true }).eq("event_id", id).eq("media_type", "video"),
    ]);
    const photo = photoRes.count ?? 0;
    const video = videoRes.count ?? 0;
    setCounts({ photo, video, all: photo + video });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: ev } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
      setEvent(ev);
      await loadCounts();
      setMedia(await fetchPage(0, "all"));
      setLoading(false);
    })();
  }, [id, fetchPage, loadCounts]);

  // Changement d'onglet : on repart de la page 0 côté serveur
  const changeFilter = async (next: MediaFilter) => {
    if (next === filter) return;
    setFilter(next);
    setHasMore(true);
    setMedia([]);
    setLoadingMore(true);
    setMedia(await fetchPage(0, next));
    setLoadingMore(false);
  };

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const rows = await fetchPage(media.length, filter);
    setMedia((prev) => {
      const seen = new Set(prev.map((p) => p.id));
      return [...prev, ...rows.filter((r) => !seen.has(r.id))];
    });
    setLoadingMore(false);
  }, [fetchPage, filter, hasMore, loadingMore, media.length]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "400px" }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [loadMore, hasMore]);

  const uploadThumb = async (uuid: string, thumb: Blob | null) => {
    if (!thumb) return null;
    const thumbPath = `${id}/thumbs/${uuid}.jpg`;
    const { error } = await supabase.storage.from("event-photos").upload(thumbPath, thumb, {
      contentType: "image/jpeg",
      upsert: false,
    });
    if (error) return null;
    return supabase.storage.from("event-photos").getPublicUrl(thumbPath).data.publicUrl;
  };

  const uploadImage = async (file: File) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_SIZE) throw new Error("invalid");
    const { full, thumb, fallback } = await compressImage(file);
    const uuid = crypto.randomUUID();
    const ext = fallback ? file.name.split(".").pop() ?? "jpg" : "jpg";
    const path = `${id}/${uuid}.${ext}`;

    const { error: upErr } = await supabase.storage.from("event-photos").upload(path, full, {
      contentType: fallback ? file.type : "image/jpeg",
      upsert: false,
    });
    if (upErr) throw upErr;

    const thumbnailUrl = await uploadThumb(uuid, thumb);
    const { error: dbErr } = await supabase.from("photos").insert({
      event_id: id!,
      url: supabase.storage.from("event-photos").getPublicUrl(path).data.publicUrl,
      thumbnail_url: thumbnailUrl,
      file_name: file.name,
      storage_path: path,
      media_type: "photo",
    });
    if (dbErr) throw dbErr;
  };

  const uploadVideo = async (file: File) => {
    const uuid = crypto.randomUUID();
    const { thumb } = await generateVideoPoster(file);
    const ext = file.name.split(".").pop() ?? "mp4";
    const path = `${id}/${uuid}.${ext}`;

    // La vidéo est envoyée telle quelle, sans compression
    const { error: upErr } = await supabase.storage.from("event-photos").upload(path, file, {
      contentType: file.type || "video/mp4",
      upsert: false,
    });
    if (upErr) throw upErr;

    const thumbnailUrl = await uploadThumb(uuid, thumb);
    const { error: dbErr } = await supabase.from("photos").insert({
      event_id: id!,
      url: supabase.storage.from("event-photos").getPublicUrl(path).data.publicUrl,
      thumbnail_url: thumbnailUrl,
      file_name: file.name,
      storage_path: path,
      media_type: "video",
    });
    if (dbErr) throw dbErr;
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !id || !event) return;
    const selected = Array.from(e.target.files);
    if (selected.length === 0) return;

    // Vidéos trop lourdes : rejetées immédiatement, les autres fichiers continuent
    const files = selected.filter((file) => {
      if (file.type.startsWith("video/") && file.size > MAX_VIDEO_SIZE) {
        toast({
          title: `${file.name} ignoré`,
          description:
            "Cette vidéo est trop lourde (max 50 Mo). Filmez des séquences plus courtes, environ 20 secondes.",
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
    if (files.length === 0) return;

    setUploading(true);
    setPhase("compressing");
    setTotal(files.length);
    setDone(0);

    let ok = 0;
    let failed = 0;
    let index = 0;
    let started = false;

    const worker = async () => {
      while (index < files.length) {
        const file = files[index++];
        try {
          if (file.type.startsWith("video/")) {
            await uploadVideo(file);
          } else {
            await uploadImage(file);
          }
          ok++;
        } catch {
          failed++;
        }
        if (!started) {
          started = true;
          setPhase("uploading");
        }
        setDone(ok + failed);
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, files.length) }, worker));

    setUploading(false);
    setPhase("idle");

    if (ok > 0) {
      setSuccessText(
        failed > 0
          ? `${ok} fichier${ok > 1 ? "s" : ""} envoyé${ok > 1 ? "s" : ""}, ${failed} ont échoué`
          : "Vos souvenirs ont bien été partagés ! 🎉"
      );
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
      await loadCounts();
      setHasMore(true);
      setMedia(await fetchPage(0, filter));
    } else {
      toast({
        title: "Envoi impossible",
        description: `${failed} fichier${failed > 1 ? "s" : ""} n'ont pas pu être envoyé${failed > 1 ? "s" : ""}.`,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Événement introuvable</h1>
          <p className="text-muted-foreground">Vérifiez le lien ou le QR code.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-20">
        {/* Hero */}
        <div className="bg-gradient-hero text-white py-10 px-4 text-center">
          <div className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium inline-block mb-3 capitalize">
            {event.event_type}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{event.name}</h1>
          <div className="flex items-center justify-center gap-2 text-white/90 text-sm">
            <Calendar className="w-4 h-4" />
            {new Date(event.event_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>

        <div className="container mx-auto px-4 max-w-4xl">
          {/* Upload */}
          <div className="-mt-8 mb-10">
            <div className="bg-card rounded-2xl border border-border shadow-card p-6 text-center">
              {showSuccess ? (
                <div className="py-4 animate-fade-in">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Check className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-lg font-semibold">{successText}</p>
                </div>
              ) : uploading ? (
                <div className="py-4">
                  <p className="text-lg font-semibold mb-3">
                    {phase === "compressing" ? "Préparation des fichiers..." : "Envoi en cours..."}
                  </p>
                  <Progress value={total ? (done / total) * 100 : 0} className="mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Envoi {Math.min(done + 1, total)} / {total}...
                  </p>
                </div>
              ) : (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <Button
                    variant="hero"
                    size="lg"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full sm:w-auto text-lg h-14 px-10"
                  >
                    <Camera className="w-6 h-6" /> Ajouter mes photos
                  </Button>
                  <p className="text-xs text-muted-foreground mt-3">
                    Photos et vidéos · vidéos limitées à 50 Mo (environ 20 secondes)
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Plusieurs fichiers à la fois · Aucune inscription requise
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Gallery */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h2 className="text-xl font-bold">
              Album partagé <span className="text-muted-foreground font-normal">({counts.all})</span>
            </h2>
            <MediaTabs value={filter} onChange={changeFilter} counts={counts} />
          </div>

          {media.length === 0 && !loadingMore ? (
            <div className="text-center py-12 bg-card rounded-2xl border border-border">
              <p className="text-muted-foreground">
                {filter === "video"
                  ? "Aucune vidéo pour l'instant."
                  : filter === "photo"
                    ? "Aucune photo pour l'instant."
                    : "Soyez le premier à partager un souvenir !"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {media.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setLightbox(p)}
                  style={{ aspectRatio: "1 / 1" }}
                  className="relative w-full overflow-hidden rounded-xl bg-muted border border-border shadow-soft hover:shadow-card transition-all"
                >
                  <img
                    src={p.thumbnail_url ?? (p.media_type === "video" ? undefined : p.url)}
                    alt={p.file_name}
                    loading="lazy"
                    decoding="async"
                    width={400}
                    height={400}
                    className="w-full h-full object-cover"
                  />
                  {p.media_type === "video" && <PlayOverlay />}
                </button>
              ))}
            </div>
          )}
          <div ref={sentinelRef} className="h-10 flex items-center justify-center">
            {loadingMore && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
          </div>
        </div>

        {lightbox && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setLightbox(null)}
          >
            <button
              type="button"
              aria-label="Fermer"
              onClick={() => setLightbox(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white"
            >
              <X className="w-6 h-6" />
            </button>
            {lightbox.media_type === "video" ? (
              <video
                src={lightbox.url}
                poster={lightbox.thumbnail_url ?? undefined}
                controls
                playsInline
                preload="none"
                className="max-h-[90vh] max-w-full rounded-xl"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <img
                src={lightbox.url}
                alt={lightbox.file_name}
                decoding="async"
                className="max-h-[90vh] max-w-full object-contain rounded-xl"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        )}

        <div className="text-center mt-12 pb-4">
          <a href="/" className="text-xs text-muted-foreground hover:text-primary transition-colors">
            Propulsé par QR Memories
          </a>
        </div>
      </main>
    </div>
  );
};

export default GuestEvent;
