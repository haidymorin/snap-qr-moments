import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import FaceSearch from "@/components/FaceSearch";
import { gridUrl, viewUrl, fallbackToOriginal } from "@/lib/imageUrl";
import { downloadMedia } from "@/lib/downloadMedia";
import { uploadWithProgress } from "@/lib/uploadWithProgress";
import { useLanguage } from "@/contexts/LanguageContext";
import { compressImage } from "@/lib/imageCompression";
import { generateVideoPoster } from "@/lib/videoPoster";
import MediaTabs, { MediaFilter, PlayOverlay } from "@/components/MediaTabs";
import { Camera, ChevronLeft, ChevronRight, Download, Images, Loader2, X } from "lucide-react";

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

/* Un fichier et son état, du choix jusqu'à l'album.
   C'est cet objet qui permet de dire à l'invité ce qui a échoué et pourquoi. */
type ItemState = "waiting" | "preparing" | "sending" | "sent" | "failed";
interface Item {
  key: string;
  file: File;
  state: ItemState;
  reason?: string;
  /** Part envoyée, de 0 à 1. Renseignée pour les vidéos. */
  progress?: number;
}

const MAX_IMAGE_SIZE = 25 * 1024 * 1024;
/* Les vidéos partent telles quelles, sans recompression : on garde la
   qualité d'origine. Le plafond du bucket de stockage doit être au moins
   égal à cette valeur, sinon le serveur refuse le fichier. */
const MAX_VIDEO_SIZE = 1024 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const PAGE_SIZE = 24;
const CONCURRENCY = 3;

/* Traduit une erreur technique en une raison lisible par un invité. */
const reasonOf = (err: unknown): string => {
  const msg = String((err as { message?: string })?.message ?? err ?? "").toLowerCase();
  if (msg.includes("format")) return "errFormat";
  if (msg.includes("imagetoobig")) return "errTooBig";
  if (msg.includes("videotoobig")) return "errVideoTooBig";
  if (msg.includes("row-level") || msg.includes("policy") || msg.includes("unauthorized")) return "errRefused";
  return "errNetwork";
};

const GuestEvent = () => {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useLanguage();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const [event, setEvent] = useState<EventRow | null>(null);
  const [media, setMedia] = useState<MediaRow[]>([]);
  const [filter, setFilter] = useState<MediaFilter>("all");
  const [counts, setCounts] = useState({ all: 0, photo: 0, video: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [lightbox, setLightbox] = useState<MediaRow | null>(null);
  /* null = on montre tout ; une liste = on ne montre que les photos trouvées
     pour l'invité qui vient de se prendre en photo. */
  const [selectionVisages, setSelectionVisages] = useState<string[] | null>(null);
  /* Ce que l'album affiche réellement. `media` reste la source de vérité ;
     la recherche par visage n'est qu'un filtre posé par-dessus, ce qui évite
     de dupliquer l'état et de le désynchroniser au chargement des pages
     suivantes. */
  const visibles = useMemo(
    () => (selectionVisages ? media.filter((m) => selectionVisages.includes(m.id)) : media),
    [media, selectionVisages],
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const saveCurrent = async () => {
    if (!lightbox || saving) return;
    setSaving(true);
    setSaveError(false);
    try {
      await downloadMedia(lightbox.url, lightbox.file_name);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };
  /* Navigation dans la visionneuse : flèches à l'écran et au clavier. */
  const lightboxIndex = lightbox ? visibles.findIndex((m) => m.id === lightbox.id) : -1;
  const goRelative = useCallback(
    (delta: number) => {
      if (visibles.length === 0) return;
      setLightbox((current) => {
        if (!current) return current;
        const i = visibles.findIndex((m) => m.id === current.id);
        if (i < 0) return current;
        return visibles[(i + delta + visibles.length) % visibles.length];
      });
    },
    [visibles]
  );

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goRelative(1);
      else if (e.key === "ArrowLeft") goRelative(-1);
      else if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, goRelative]);


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
      supabase.rpc("guest_count_media", { p_event_id: id, p_media: "photo" }),
      supabase.rpc("guest_count_media", { p_event_id: id, p_media: "video" }),
    ]);
    const photo = (photoRes.data as number | null) ?? 0;
    const video = (videoRes.data as number | null) ?? 0;
    setCounts({ photo, video, all: photo + video });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: evRows } = await supabase.rpc("guest_get_event", { p_event_id: id });
      const ev = Array.isArray(evRows) ? evRows[0] ?? null : null;
      setEvent(ev);
      await loadCounts();
      setMedia(await fetchPage(0, "all"));
      setLoading(false);
    })();
  }, [id, fetchPage, loadCounts]);

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

  const uploadVideo = async (file: File, onProgress?: (ratio: number) => void) => {
    const uuid = crypto.randomUUID();
    const { thumb } = await generateVideoPoster(file);
    const ext = file.name.split(".").pop() ?? "mp4";
    const path = `${id}/${uuid}.${ext}`;

    await uploadWithProgress({
      bucket: "event-photos",
      path,
      file,
      contentType: file.type || "video/mp4",
      onProgress,
    });

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

  const mark = (key: string, state: ItemState, reason?: string) =>
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, state, reason } : it)));

  const markProgress = (key: string, progress: number) =>
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, progress } : it)));

  /* Refus décidés avant tout envoi : l'invité voit la raison tout de suite,
     sans attendre une minute pour rien. */
  const preflight = (file: File): string | null => {
    if (file.type.startsWith("video/")) {
      return file.size > MAX_VIDEO_SIZE ? "errVideoTooBig" : null;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return "errFormat";
    if (file.size > MAX_IMAGE_SIZE) return "errTooBig";
    return null;
  };

  const runQueue = useCallback(async (queue: Item[]) => {
    setBusy(true);
    let cursor = 0;
    const worker = async () => {
      while (cursor < queue.length) {
        const it = queue[cursor++];
        try {
          mark(it.key, "preparing");
          if (it.file.type.startsWith("video/")) {
            mark(it.key, "sending");
            await uploadVideo(it.file, (ratio) => markProgress(it.key, ratio));
          } else {
            await uploadImage(it.file);
          }
          mark(it.key, "sent");
        } catch (err) {
          mark(it.key, "failed", reasonOf(err));
        }
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker)
    );
    setBusy(false);
    await loadCounts();
    setHasMore(true);
    setMedia(await fetchPage(0, filter));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage, filter, loadCounts, id]);

  const handleSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !id || !event) return;
    const selected = Array.from(e.target.files);
    e.target.value = "";
    if (selected.length === 0) return;

    const next: Item[] = selected.map((file) => {
      const refused = preflight(file);
      return {
        key: crypto.randomUUID(),
        file,
        state: refused ? "failed" : "waiting",
        reason: refused ?? undefined,
      };
    });

    setItems(next);
    const queue = next.filter((it) => it.state === "waiting");
    if (queue.length > 0) await runQueue(queue);
  };

  const retryFailed = async () => {
    const retryable = items.filter((it) => it.state === "failed" && !preflight(it.file));
    if (retryable.length === 0) return;
    setItems((prev) =>
      prev.map((it) =>
        retryable.some((r) => r.key === it.key) ? { ...it, state: "waiting", reason: undefined } : it
      )
    );
    await runQueue(retryable);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5 text-center">
        <div>
          <h1 className="text-3xl">{t("guest.notFoundTitle")}</h1>
          <p className="mt-3 text-muted-foreground">{t("guest.notFoundText")}</p>
        </div>
      </div>
    );
  }

  const sent = items.filter((it) => it.state === "sent").length;
  const failed = items.filter((it) => it.state === "failed").length;
  const finished = items.length > 0 && !busy;
  const canRetry = items.some((it) => it.state === "failed" && !preflight(it.file));
  const dateLabel = new Date(event.event_date).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const stateLabel = (it: Item) => {
    if (it.state === "sent") return t("guest.sent");
    if (it.state === "failed") return t(`guest.${it.reason ?? "errNetwork"}`);
    if (it.state === "preparing") return t("guest.preparing");
    if (it.state === "sending")
      return it.progress !== undefined
        ? `${t("guest.sending")} ${Math.round(it.progress * 100)} %`
        : t("guest.sending");
    return t("guest.waiting");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-4xl px-5 py-10 text-center sm:py-14">
          <p className="label-mono">{event.event_type}</p>
          <h1 className="mt-3 text-[clamp(30px,7vw,54px)]">{event.name}</h1>
          <p className="label-mono mt-4">{dateLabel}</p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 pb-20">
        {/* Dépôt */}
        <section className="mt-8 border border-border bg-card p-6 sm:p-8">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleSelection}
            className="hidden"
          />
          <input
            ref={libraryInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleSelection}
            className="hidden"
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={busy}
              className="inline-flex min-h-[56px] items-center justify-center gap-3 border border-primary bg-primary px-8 py-4 text-xs font-semibold uppercase tracking-[0.1em] text-primary-foreground transition-colors hover:bg-transparent hover:text-primary disabled:opacity-50"
            >
              <Camera className="h-5 w-5" aria-hidden="true" />
              {t("guest.takePhoto")}
            </button>
            <button
              type="button"
              onClick={() => libraryInputRef.current?.click()}
              disabled={busy}
              className="inline-flex min-h-[56px] items-center justify-center gap-3 border border-border px-8 py-4 text-xs font-semibold uppercase tracking-[0.1em] text-foreground transition-colors hover:border-primary disabled:opacity-50"
            >
              <Images className="h-5 w-5" aria-hidden="true" />
              {t("guest.choosePhotos")}
            </button>
          </div>

          <p className="mt-5 text-center text-sm text-muted-foreground">{t("guest.hint1")}</p>
          <p className="mt-1 text-center text-sm text-muted-foreground">{t("guest.hint2")}</p>

          {/* État fichier par fichier */}
          {items.length > 0 && (
            <div className="mt-8 border-t border-border pt-6" role="status" aria-live="polite">
              <div className="flex items-baseline justify-between gap-4">
                <p className="label-mono">
                  {busy ? t("guest.sendingTitle") : t("guest.doneTitle")}
                </p>
                <p className="label-mono">
                  {sent + failed} / {items.length}
                </p>
              </div>

              <div className="mt-3 h-px w-full bg-border">
                <div
                  className="h-px bg-primary transition-[width] duration-300"
                  style={{ width: `${items.length ? ((sent + failed) / items.length) * 100 : 0}%` }}
                />
              </div>

              <ul className="mt-5 divide-y divide-border border-y border-border">
                {items.map((it) => (
                  <li key={it.key} className="flex items-center justify-between gap-4 py-3">
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {it.file.name}
                    </span>
                    <span
                      className={`label-mono shrink-0 ${
                        it.state === "failed" ? "text-destructive opacity-100" : ""
                      }`}
                    >
                      {stateLabel(it)}
                    </span>
                  </li>
                ))}
              </ul>

              {finished && (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    {failed === 0 ? t("guest.allSent") : null}
                  </p>
                  <div className="flex gap-3">
                    {canRetry && (
                      <button
                        type="button"
                        onClick={retryFailed}
                        className="inline-flex min-h-[44px] items-center border border-primary px-5 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                      >
                        {t("guest.retry")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setItems([])}
                      className="label-mono min-h-[44px] px-2 hover:text-foreground"
                    >
                      {t("guest.dismiss")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <FaceSearch eventId={event.id} onResultats={setSelectionVisages} />

        {/* Album */}
        <div className="mt-14 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-2xl">
            {t("guest.album")}{" "}
            <span className="text-muted-foreground">({counts.all})</span>
          </h2>
          <MediaTabs value={filter} onChange={changeFilter} counts={counts} />
        </div>

        {visibles.length === 0 && !loadingMore ? (
          <div className="mt-6 border border-border px-6 py-16 text-center">
            <p className="text-muted-foreground">
              {filter === "video"
                ? t("guest.emptyVideos")
                : filter === "photo"
                  ? t("guest.emptyPhotos")
                  : t("guest.emptyAll")}
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4">
            {visibles.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setLightbox(p)}
                style={{ aspectRatio: "1 / 1" }}
                className="relative w-full overflow-hidden bg-muted transition-opacity hover:opacity-90"
              >
                <img
                  src={
                    p.media_type === "video"
                      ? p.thumbnail_url ?? undefined
                      : gridUrl(p.url)
                  }
                  onError={(e) => fallbackToOriginal(e, p.thumbnail_url ?? p.url)}
                  alt={p.file_name}
                  loading="lazy"
                  decoding="async"
                  width={700}
                  height={700}
                  className="h-full w-full object-cover"
                />
                {p.media_type === "video" && <PlayOverlay />}
              </button>
            ))}
          </div>
        )}

        <div ref={sentinelRef} className="flex h-10 items-center justify-center">
          {loadingMore && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </div>

        <div className="mt-12 text-center">
          <a href="/" className="label-mono hover:text-foreground">
            {t("guest.poweredBy")}
          </a>
        </div>
      </main>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F0E0C]/95 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              saveCurrent();
            }}
            disabled={saving}
            className="label-mono absolute left-4 top-4 flex min-h-[48px] items-center gap-2 border border-white/40 px-4 text-white opacity-100 transition-colors hover:bg-white/10 disabled:opacity-60"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {saving ? t("guest.downloading") : t("guest.download")}
          </button>
          {saveError && (
            <p role="alert" className="absolute left-4 top-[76px] max-w-[60vw] text-sm text-white">
              {t("guest.downloadFailed")}
            </p>
          )}

          <button
            type="button"
            aria-label={t("guest.close")}
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center border border-white/40 text-white transition-colors hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
            {visibles.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Photo précédente"
                  onClick={(e) => {
                    e.stopPropagation();
                    goRelative(-1);
                  }}
                  className="absolute left-3 top-1/2 flex h-14 w-14 -translate-y-1/2 items-center justify-center border border-white/40 text-white transition-colors hover:bg-white/10"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  aria-label="Photo suivante"
                  onClick={(e) => {
                    e.stopPropagation();
                    goRelative(1);
                  }}
                  className="absolute right-3 top-1/2 flex h-14 w-14 -translate-y-1/2 items-center justify-center border border-white/40 text-white transition-colors hover:bg-white/10"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
                <span className="label-mono absolute bottom-5 left-1/2 -translate-x-1/2 text-white">
                  {lightboxIndex + 1} / {visibles.length}
                </span>
              </>
            )}
          {lightbox.media_type === "video" ? (
            <video
              src={lightbox.url}
              poster={lightbox.thumbnail_url ?? undefined}
              controls
              playsInline
              preload="none"
              className="max-h-[90vh] max-w-full"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={viewUrl(lightbox.url)}
              onError={(e) => fallbackToOriginal(e, lightbox.url)}
              alt={lightbox.file_name}
              decoding="async"
              className="max-h-[90vh] max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default GuestEvent;
