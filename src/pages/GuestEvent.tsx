import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import FaceSearch from "@/components/FaceSearch";
import { gridUrl, viewUrl, fallbackToOriginal } from "@/lib/imageUrl";
import { downloadMedia } from "@/lib/downloadMedia";
import { telechargerEnLots, type Avancement } from "@/lib/telechargerLot";
import { envoyerSurR2, extensionDe, typeDeclare } from "@/lib/r2";
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
  /** La formule payée : elle décide de ce que la page propose. */
  plan: string;
}

/* Les formules qui incluent la recherche par visage. L'Essentiel à 59 € ne
   l'inclut pas : y afficher le bouton serait promettre ce qui n'a pas été
   vendu, et envoyer des images chez Amazon pour un événement qui ne les a pas
   payées. */
const PLANS_AVEC_VISAGE = ["souvenir", "heritage", "admin"];

/* Ce que ce téléphone a déposé.
 *
 * L'invité ne se connecte pas : on ne sait donc pas qui il est, et c'est très
 * bien ainsi. Mais son navigateur, lui, peut se souvenir de ce qu'il a envoyé.
 * La liste reste sur l'appareil, ne part nulle part, et répond à la seule
 * question qu'il se pose vraiment : « est-ce que mes photos sont bien
 * arrivées ? » */
const cleEnvois = (eventId: string) => `qrm:envois:${eventId}`;

const lireEnvois = (eventId: string): string[] => {
  try {
    const brut = localStorage.getItem(cleEnvois(eventId));
    const liste = brut ? JSON.parse(brut) : [];
    return Array.isArray(liste) ? liste.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
};

const noterEnvoi = (eventId: string, photoId: string) => {
  try {
    const liste = lireEnvois(eventId);
    if (liste.includes(photoId)) return;
    localStorage.setItem(cleEnvois(eventId), JSON.stringify([photoId, ...liste].slice(0, 500)));
  } catch {
    /* Navigation privée, stockage plein : l'onglet n'apparaîtra pas, et le
       dépôt fonctionne quand même. C'est un confort, jamais une dépendance. */
  }
};
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
  /** Ce que la machine a répondu, quand on n'a pas su le traduire. */
  detail?: string;
  /** Part envoyée, de 0 à 1. Renseignée pour les vidéos. */
  progress?: number;
}

const MAX_IMAGE_SIZE = 25 * 1024 * 1024;
/* Les vidéos partent telles quelles, sans recompression : on garde la qualité
   d'origine.

   ATTENTION — cette valeur doit correspondre au plafond réel du stockage.
   Depuis la migration vers Cloudflare R2, l'envoi se fait en un seul PUT signé,
   qui accepte jusqu'à 5 Go. On s'arrête bien en dessous : au-delà de 500 Mo,
   l'envoi depuis le réseau d'une salle devient trop long pour être fiable, et
   mieux vaut un refus honnête en une seconde qu'une longue attente pour rien.

   Si ce plafond bouge, vérifier aussi VALIDITE dans la fonction
   `r2-sign-upload` : l'URL signée doit vivre plus longtemps que l'envoi. */
const MAX_VIDEO_SIZE = 500 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const PAGE_SIZE = 24;
const CONCURRENCY = 3;

/* Traduit une erreur technique en une raison lisible par un invité.
 *
 * Le cas du dépassement de taille manquait, et c'est le plus fréquent : le
 * stockage répond « payload too large » ou « exceeded the maximum allowed
 * size », qu'aucune ligne ne reconnaissait. L'invité voyait donc « connexion
 * perdue » alors que sa connexion allait très bien, et il réessayait
 * indéfiniment le même fichier trop lourd.
 *
 * Le dernier cas reste le réseau, mais il ne doit être qu'un dernier recours :
 * chaque erreur qu'on sait nommer évite à quelqu'un de chercher au mauvais
 * endroit. */
const reasonOf = (err: unknown): string => {
  const brut = String((err as { message?: string })?.message ?? err ?? "");
  const msg = brut.toLowerCase();
  if (msg.includes("imagetoobig")) return "errTooBig";
  if (msg.includes("videotoobig")) return "errVideoTooBig";
  if (
    msg.includes("payload too large") ||
    msg.includes("exceeded the maximum allowed size") ||
    msg.includes("entity too large") ||
    msg.includes("(413)")
  ) {
    return "errServerTooBig";
  }
  if (
    msg.includes("format") || msg.includes("mime") ||
    msg.includes("type_refuse") || msg.includes("(415)")
  ) {
    return "errFormat";
  }
  if (msg.includes("chemin_invalide") || msg.includes("evenement_inconnu")) return "errRefused";
  if (
    msg.includes("indisponible") || msg.includes("(500)") ||
    msg.includes("(502)") || msg.includes("(503)")
  ) {
    return "errServeur";
  }
  if (
    msg.includes("row-level") || msg.includes("policy") ||
    msg.includes("unauthorized") || msg.includes("(401)") || msg.includes("(403)")
  ) {
    return "errRefused";
  }
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
  /* Les photos où l'invité a été reconnu. Vide tant qu'aucune recherche n'a
     été faite. Elles alimentent un onglet à part, et ne remplacent jamais la
     galerie : on doit pouvoir passer de ses photos à toutes les photos sans
     perdre ni l'une ni l'autre. */
  const [mesPhotos, setMesPhotos] = useState<MediaRow[]>([]);
  /* Les lignes correspondant aux identifiants gardés sur cet appareil. */
  const [mesEnvois, setMesEnvois] = useState<MediaRow[]>([]);
  /* Ce que l'album affiche réellement. `media` reste la source de vérité ;
     la recherche par visage n'est qu'un filtre posé par-dessus, ce qui évite
     de dupliquer l'état et de le désynchroniser au chargement des pages
     suivantes. */
  /* Ce que la galerie affiche : soit les photos reconnues, soit la page
     courante de l'album. Une seule source par onglet, donc pas de
     désynchronisation possible au chargement des pages suivantes. */
  const visibles = useMemo(() => {
    if (filter === "mine") return mesPhotos;
    if (filter === "envois") return mesEnvois;
    return media;
  }, [filter, media, mesPhotos, mesEnvois]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  /* Tout l'onglet courant, en une ou plusieurs archives.
   *
   * On ne télécharge que ce que l'onglet montre : « Photos de moi » et
   * « Mes envois » tiennent en un seul fichier, l'album complet en plusieurs.
   * Sur l'album, seule la page déjà chargée est disponible côté navigateur —
   * on va donc chercher la liste entière avant de commencer, sinon on
   * n'archiverait que ce que l'invité a fait défiler. */
  const [lot, setLot] = useState<Avancement | null>(null);

  const toutTelecharger = async () => {
    if (!id || !event || lot) return;
    let liste = visibles;
    if (filter !== "mine" && filter !== "envois") {
      const { data } = await supabase.rpc("guest_list_media", {
        p_event_id: id, p_media: filter, p_limit: 2000, p_offset: 0,
      });
      liste = ((data ?? []) as MediaRow[]);
    }
    if (liste.length === 0) return;
    setLot({ faits: 0, total: liste.length, lot: 1, lots: 1 });
    try {
      await telechargerEnLots(
        liste.map((m) => ({ url: m.url, nom: m.file_name || `${m.id}.jpg` })),
        (event.name || "souvenirs").replace(/\s+/g, "-").toLowerCase(),
        setLot,
      );
    } finally {
      setLot(null);
    }
  };

  /* Enregistrer un fichier depuis la grille, sans passer par la visionneuse. */
  const [enregistrement, setEnregistrement] = useState<string | null>(null);
  const enregistrer = async (row: MediaRow) => {
    if (enregistrement) return;
    setEnregistrement(row.id);
    try {
      await downloadMedia(row.url, row.file_name);
    } catch {
      /* L'échec est déjà signalé dans la visionneuse ; ici on reste discret. */
    } finally {
      setEnregistrement(null);
    }
  };

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

  const chargerEnvois = useCallback(async () => {
    if (!id) return;
    const ids = lireEnvois(id);
    if (ids.length === 0) { setMesEnvois([]); return; }
    const { data } = await supabase.rpc("guest_list_by_ids", { p_event_id: id, p_ids: ids });
    setMesEnvois((data ?? []) as MediaRow[]);
  }, [id]);

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
      await chargerEnvois();
      await loadCounts();
      setMedia(await fetchPage(0, "all"));
      setLoading(false);
    })();
  }, [id, fetchPage, loadCounts]);

  const changeFilter = async (next: MediaFilter) => {
    if (next === filter) return;
    setFilter(next);
    // Les photos reconnues sont déjà en mémoire : aucun aller-retour, aucune
    // pagination, l'onglet s'affiche instantanément.
    if (next === "mine") {
      setHasMore(false);
      return;
    }
    setHasMore(true);
    setMedia([]);
    setLoadingMore(true);
    setMedia(await fetchPage(0, next));
    setLoadingMore(false);
  };

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || filter === "mine") return;
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

  /* La vignette. Elle porte le même identifiant que l'image, suffixé, pour
     qu'on puisse retrouver et supprimer les deux fichiers d'un même média sans
     tenir de registre séparé. */
  const uploadThumb = async (uuid: string, thumb: Blob | null) => {
    if (!thumb) return null;
    try {
      return await envoyerSurR2({
        eventId: id!,
        chemin: `${id}/${uuid}-thumb.jpg`,
        fichier: thumb,
        contentType: "image/jpeg",
      });
    } catch {
      // Une vignette manquante n'est pas grave : la grille retombera sur
      // l'image entière. Perdre la photo, si.
      return null;
    }
  };

  const uploadImage = async (file: File) => {
    const { full, thumb, fallback } = await compressImage(file);
    const uuid = crypto.randomUUID();
    const contentType = fallback ? file.type || "image/jpeg" : "image/jpeg";
    const path = `${id}/${uuid}.${extensionDe(contentType)}`;

    const url = await envoyerSurR2({
      eventId: id!,
      chemin: path,
      fichier: full,
      contentType,
    });

    const thumbnailUrl = await uploadThumb(uuid, thumb);
    const { data: ligne, error: dbErr } = await supabase.from("photos").insert({
      event_id: id!,
      url,
      thumbnail_url: thumbnailUrl,
      file_name: file.name,
      storage_path: path,
      media_type: "photo",
    }).select("id").single();
    if (dbErr) throw dbErr;
    if (ligne?.id) noterEnvoi(id!, ligne.id);
  };

  const uploadVideo = async (file: File, onProgress?: (ratio: number) => void) => {
    const uuid = crypto.randomUUID();
    const { thumb } = await generateVideoPoster(file);
    const contentType = typeDeclare(file, "video/mp4");
    const path = `${id}/${uuid}.${extensionDe(contentType)}`;

    const url = await envoyerSurR2({
      eventId: id!,
      chemin: path,
      fichier: file,
      contentType,
      onProgress,
    });

    const thumbnailUrl = await uploadThumb(uuid, thumb);
    const { data: ligne, error: dbErr } = await supabase.from("photos").insert({
      event_id: id!,
      url,
      thumbnail_url: thumbnailUrl,
      file_name: file.name,
      storage_path: path,
      media_type: "video",
    }).select("id").single();
    if (dbErr) throw dbErr;
    if (ligne?.id) noterEnvoi(id!, ligne.id);
  };

  const mark = (key: string, state: ItemState, reason?: string, detail?: string) =>
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, state, reason, detail } : it)));

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
          const raison = reasonOf(err);
          /* Quand on ne sait pas nommer la cause, on montre au moins ce que la
             machine a répondu. Mieux vaut une ligne technique qu'un invité qui
             réessaie vingt fois le même fichier sans jamais savoir pourquoi. */
          const brut = String((err as { message?: string })?.message ?? err ?? "");
          mark(it.key, "failed", raison, raison === "errNetwork" ? brut.slice(0, 140) : undefined);
        }
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker)
    );
    setBusy(false);
    await chargerEnvois();
    await loadCounts();
    setHasMore(true);
    setMedia(await fetchPage(0, filter));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage, filter, loadCounts, chargerEnvois, id]);

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
                  <li key={it.key} className="py-3">
                    <div className="flex items-center justify-between gap-4">
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
                    </div>
                    {it.detail && (
                      <p className="mt-1 break-words text-[11px] leading-relaxed text-muted-foreground">
                        {t("guest.errDetail")} {it.detail}
                      </p>
                    )}
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

        {PLANS_AVEC_VISAGE.includes(event.plan) && (
        <FaceSearch
          eventId={event.id}
          onResultats={(photos) => {
            setMesPhotos(photos ?? []);
            // On bascule sur l'onglet quand il y a quelque chose à montrer,
            // et on revient à l'album quand l'invité efface sa reconnaissance.
            setFilter(photos && photos.length ? "mine" : "all");
          }}
        />
        )}

        {/* Album */}
        <div className="mt-14 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-2xl">
            {t("guest.album")}{" "}
            <span className="text-muted-foreground">({counts.all})</span>
          </h2>
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <MediaTabs
              value={filter}
              onChange={changeFilter}
              counts={counts}
              mineCount={mesPhotos.length}
              envoisCount={mesEnvois.length}
            />
            {visibles.length > 0 && (
              <button
                type="button"
                onClick={toutTelecharger}
                disabled={lot !== null}
                className="label-mono inline-flex min-h-[44px] items-center gap-2 border border-border px-4 transition-colors hover:border-primary disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {lot
                  ? `${t("guest.zipEnCours")} ${lot.faits}/${lot.total}`
                  : `${t("guest.zipTout")} (${visibles.length})`}
              </button>
            )}
          </div>
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
              <div
                key={p.id}
                style={{ aspectRatio: "1 / 1" }}
                className="group relative w-full overflow-hidden bg-muted"
              >
              <button
                type="button"
                onClick={() => setLightbox(p)}
                aria-label={p.file_name}
                className="block h-full w-full transition-opacity hover:opacity-90"
              >
                <img
                  src={
                    p.media_type === "video"
                      ? p.thumbnail_url ?? undefined
                      : gridUrl(p.thumbnail_url ?? p.url)
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
              <button
                type="button"
                onClick={() => enregistrer(p)}
                aria-label={t("guest.save")}
                title={t("guest.save")}
                className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center border border-white/40 bg-black/45 text-white transition-opacity hover:bg-black/70 focus-visible:opacity-100"
              >
                {enregistrement === p.id
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Download className="h-4 w-4" />}
              </button>
              </div>
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
