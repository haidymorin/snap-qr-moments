import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { compressImage } from "@/lib/imageCompression";
import { Calendar, Camera, Check, Loader2, X } from "lucide-react";

interface EventRow {
  id: string;
  name: string;
  event_date: string;
  event_type: string;
}
interface PhotoRow {
  id: string;
  url: string;
  thumbnail_url: string | null;
  file_name: string;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const PAGE_SIZE = 24;
const CONCURRENCY = 3;

const GuestEvent = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [event, setEvent] = useState<EventRow | null>(null);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [phase, setPhase] = useState<"idle" | "compressing" | "uploading">("idle");
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successText, setSuccessText] = useState("");
  const [lightbox, setLightbox] = useState<PhotoRow | null>(null);

  const fetchPage = useCallback(
    async (from: number) => {
      if (!id) return [] as PhotoRow[];
      const { data } = await supabase
        .from("photos")
        .select("id, url, thumbnail_url, file_name")
        .eq("event_id", id)
        .order("uploaded_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      const rows = (data ?? []) as PhotoRow[];
      setHasMore(rows.length === PAGE_SIZE);
      return rows;
    },
    [id]
  );

  const reloadFirstPage = useCallback(async () => {
    const rows = await fetchPage(0);
    setPhotos(rows);
  }, [fetchPage]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: ev } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
      setEvent(ev);
      const rows = await fetchPage(0);
      setPhotos(rows);
      setLoading(false);
    })();
  }, [id, fetchPage]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const rows = await fetchPage(photos.length);
    setPhotos((prev) => {
      const seen = new Set(prev.map((p) => p.id));
      return [...prev, ...rows.filter((r) => !seen.has(r.id))];
    });
    setLoadingMore(false);
  }, [fetchPage, hasMore, loadingMore, photos.length]);

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

  const uploadOne = async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE) {
      throw new Error("invalid");
    }
    const { full, thumb, fallback } = await compressImage(file);
    const uuid = crypto.randomUUID();
    const ext = fallback ? file.name.split(".").pop() ?? "jpg" : "jpg";
    const path = `${id}/${uuid}.${ext}`;

    const { error: upErr } = await supabase.storage.from("event-photos").upload(path, full, {
      contentType: fallback ? file.type : "image/jpeg",
      upsert: false,
    });
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage.from("event-photos").getPublicUrl(path);

    let thumbnailUrl: string | null = null;
    if (thumb) {
      const thumbPath = `${id}/thumbs/${uuid}.jpg`;
      const { error: tErr } = await supabase.storage.from("event-photos").upload(thumbPath, thumb, {
        contentType: "image/jpeg",
        upsert: false,
      });
      if (!tErr) {
        thumbnailUrl = supabase.storage.from("event-photos").getPublicUrl(thumbPath).data.publicUrl;
      }
    }

    const { error: dbErr } = await supabase.from("photos").insert({
      event_id: id!,
      url: pub.publicUrl,
      thumbnail_url: thumbnailUrl,
      file_name: file.name,
      storage_path: path,
    });
    if (dbErr) throw dbErr;
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !id || !event) return;
    const files = Array.from(e.target.files);
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
          await uploadOne(file);
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
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (ok > 0) {
      setSuccessText(
        failed > 0
          ? `${ok} photo${ok > 1 ? "s" : ""} envoyée${ok > 1 ? "s" : ""}, ${failed} ont échoué`
          : "Vos photos ont bien été partagées ! 🎉"
      );
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
      reloadFirstPage();
    } else {
      toast({
        title: "Envoi impossible",
        description: `${failed} photo${failed > 1 ? "s" : ""} n'ont pas pu être envoyée${failed > 1 ? "s" : ""}.`,
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
                    {phase === "compressing" ? "Préparation des photos..." : "Envoi en cours..."}
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
                    accept="image/*"
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
                    Plusieurs photos à la fois · Aucune inscription requise
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Gallery */}
          <h2 className="text-xl font-bold mb-4">
            Album partagé <span className="text-muted-foreground font-normal">({photos.length})</span>
          </h2>
          {photos.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-2xl border border-border">
              <p className="text-muted-foreground">Soyez le premier à partager une photo !</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {photos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setLightbox(p)}
                  style={{ aspectRatio: "1 / 1" }}
                  className="w-full overflow-hidden rounded-xl bg-muted border border-border shadow-soft hover:shadow-card transition-all"
                >
                  <img
                    src={p.thumbnail_url ?? p.url}
                    alt={p.file_name}
                    loading="lazy"
                    decoding="async"
                    width={400}
                    height={400}
                    className="w-full h-full object-cover"
                  />
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
            <img
              src={lightbox.url}
              alt={lightbox.file_name}
              decoding="async"
              className="max-h-[90vh] max-w-full object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
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
