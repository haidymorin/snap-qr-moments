import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import MediaTabs, { MediaFilter, PlayOverlay } from "@/components/MediaTabs";
import { Calendar, Download, ArrowLeft, Copy, Check, Loader2, X } from "lucide-react";

interface EventRow {
  id: string;
  name: string;
  event_date: string;
  event_type: string;
  unique_code: string;
  user_id: string;
}
interface MediaRow {
  id: string;
  url: string;
  thumbnail_url: string | null;
  file_name: string;
  media_type: string;
}

const PAGE_SIZE = 24;

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qrRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [event, setEvent] = useState<EventRow | null>(null);
  const [media, setMedia] = useState<MediaRow[]>([]);
  const [filter, setFilter] = useState<MediaFilter>("all");
  const [counts, setCounts] = useState({ all: 0, photo: 0, video: 0 });
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [zipping, setZipping] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lightbox, setLightbox] = useState<MediaRow | null>(null);

  const guestUrl = id ? `${window.location.origin}/event/${id}` : "";

  useEffect(() => {
    if (!loading && !user) navigate("/auth?mode=signin", { replace: true });
  }, [user, loading, navigate]);

  const fetchPage = useCallback(
    async (from: number, activeFilter: MediaFilter) => {
      if (!id) return [] as MediaRow[];
      let query = supabase
        .from("photos")
        .select("id, url, thumbnail_url, file_name, media_type")
        .eq("event_id", id);
      if (activeFilter !== "all") query = query.eq("media_type", activeFilter);
      const { data } = await query
        .order("uploaded_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      const rows = (data ?? []) as MediaRow[];
      setHasMore(rows.length === PAGE_SIZE);
      return rows;
    },
    [id]
  );

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const { data: ev, error } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
      if (error || !ev) {
        toast({ title: "Événement introuvable", variant: "destructive" });
        navigate("/dashboard");
        return;
      }
      if (ev.user_id !== user.id) {
        toast({ title: "Accès refusé", variant: "destructive" });
        navigate("/dashboard");
        return;
      }
      setEvent(ev);
      const [photoRes, videoRes] = await Promise.all([
        supabase.from("photos").select("id", { count: "exact", head: true }).eq("event_id", id).eq("media_type", "photo"),
        supabase.from("photos").select("id", { count: "exact", head: true }).eq("event_id", id).eq("media_type", "video"),
      ]);
      const photo = photoRes.count ?? 0;
      const video = videoRes.count ?? 0;
      setCounts({ photo, video, all: photo + video });
      setMedia(await fetchPage(0, "all"));
      setFetching(false);
    })();
  }, [user, id, navigate, toast, fetchPage]);

  // Changement d'onglet : filtrage côté serveur, pagination remise à zéro
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
    if (!node || !hasMore || fetching) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "400px" }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [loadMore, hasMore, fetching]);

  const downloadQR = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `qr-${event?.name.replace(/\s+/g, "-")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(guestUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadZip = async () => {
    if (counts.all === 0) {
      toast({ title: "Aucun fichier à télécharger" });
      return;
    }
    setZipping(true);
    try {
      // Récupère la liste complète page par page (jamais tout d'un coup)
      const all: MediaRow[] = [];
      for (let from = 0; ; from += 200) {
        const { data } = await supabase
          .from("photos")
          .select("id, url, thumbnail_url, file_name, media_type")
          .eq("event_id", id!)
          .order("uploaded_at", { ascending: false })
          .range(from, from + 199);
        const rows = (data ?? []) as MediaRow[];
        all.push(...rows);
        if (rows.length < 200) break;
      }

      const zip = new JSZip();
      const used = new Set<string>();
      for (let i = 0; i < all.length; i += 4) {
        await Promise.all(
          all.slice(i, i + 4).map(async (p) => {
            try {
              const res = await fetch(p.url);
              const blob = await res.blob();
              let name = p.file_name;
              let n = 1;
              while (used.has(name)) name = `${n++}-${p.file_name}`;
              used.add(name);
              zip.file(name, blob);
            } catch {
              /* on continue avec les autres */
            }
          })
        );
      }
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${event?.name.replace(/\s+/g, "-")}-souvenirs.zip`);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setZipping(false);
    }
  };

  if (loading || fetching || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
            <ArrowLeft className="w-4 h-4" /> Retour au dashboard
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            <div className="lg:col-span-2">
              <div className="px-3 py-1 bg-accent rounded-full text-xs font-medium text-accent-foreground capitalize inline-block mb-3">
                {event.event_type}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-3">
                <span className="bg-gradient-hero bg-clip-text text-transparent">{event.name}</span>
              </h1>
              <div className="flex items-center gap-2 text-muted-foreground mb-6">
                <Calendar className="w-5 h-5" />
                {new Date(event.event_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </div>
              <div className="p-6 bg-card rounded-2xl border border-border shadow-soft">
                <p className="text-sm text-muted-foreground mb-2">Lien à partager avec vos invités :</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <code className="flex-1 px-4 py-2 bg-muted rounded-lg text-sm break-all">{guestUrl}</code>
                  <Button variant="outline" onClick={copyLink}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copié" : "Copier"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gradient-card rounded-2xl border border-primary/30 shadow-card text-center">
              <p className="text-sm font-medium text-muted-foreground mb-4">Votre QR Code</p>
              <div ref={qrRef} className="bg-white p-4 rounded-xl inline-block mb-4">
                <QRCodeCanvas value={guestUrl} size={180} level="H" />
              </div>
              <Button variant="hero" className="w-full" onClick={downloadQR}>
                <Download className="w-4 h-4" /> Télécharger PNG
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
            <h2 className="text-2xl font-bold">
              Galerie <span className="text-muted-foreground text-lg font-normal">({counts.all})</span>
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <MediaTabs value={filter} onChange={changeFilter} counts={counts} />
              <Button variant="outline" onClick={downloadZip} disabled={zipping || counts.all === 0}>
                <Download className="w-4 h-4" /> {zipping ? "Préparation..." : "Tout télécharger (ZIP)"}
              </Button>
            </div>
          </div>

          {media.length === 0 && !loadingMore ? (
            <div className="text-center py-16 bg-card rounded-2xl border border-border">
              <p className="text-muted-foreground">
                {filter === "video"
                  ? "Aucune vidéo pour l'instant."
                  : filter === "photo"
                    ? "Aucune photo pour l'instant."
                    : "Aucun souvenir pour l'instant. Partagez le QR code à vos invités !"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {media.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setLightbox(p)}
                  style={{ aspectRatio: "1 / 1" }}
                  className="relative w-full overflow-hidden rounded-xl bg-muted border border-border shadow-soft hover:shadow-card hover:-translate-y-1 transition-all duration-300"
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
      </main>
      <Footer />
    </div>
  );
};

export default EventDetail;
