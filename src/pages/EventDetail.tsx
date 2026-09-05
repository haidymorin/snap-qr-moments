import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { telechargerEnLots, type Avancement } from "@/lib/telechargerLot";
import { supabase } from "@/integrations/supabase/client";
import { gridUrl, viewUrl, fallbackToOriginal } from "@/lib/imageUrl";
import { downloadMedia } from "@/lib/downloadMedia";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import ReglagesEvenement, { type Reglages } from "@/components/ReglagesEvenement";
import LivreDorHote from "@/components/LivreDorHote";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import MediaTabs, { MediaFilter, PlayOverlay } from "@/components/MediaTabs";
import { Calendar, Download, ArrowLeft, Copy, Check, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";

interface EventRow {
  id: string;
  name: string;
  event_date: string;
  event_type: string;
  unique_code: string;
  user_id: string;
  plan: string;
  collecte_fin: string | null;
  message_accueil: string | null;
  livre_dor_actif: boolean;
  livre_dor_vocal: boolean;
  livre_dor_public: boolean;
}

/* Le livre d'or fait partie du Souvenir, pas de l'Essentiel : sans lui, ni ses
   réglages ni les messages n'ont de raison d'apparaître. */
const PLANS_AVEC_LIVRE_DOR = ["souvenir", "heritage", "admin"];
/* Cette page était écrite entièrement en français dans le code. C'est celle
   où atterrit un client juste après avoir payé — donc la première qu'il ouvre
   en anglais si c'est sa langue. */
const TEXTES = {
  fr: {
    retour: "Retour au tableau de bord",
    lien: "Lien à partager avec vos invités",
    copier: "Copier", copie: "Copié",
    qr: "Votre QR code",
    telechargerQR: "Télécharger le QR (PNG)",
    signaletique: "Mes affiches à imprimer",
    galerie: "Galerie",
    toutTelecharger: "Tout télécharger (ZIP)",
    preparation: "Préparation",
    videTout: "Aucun souvenir pour l'instant. Partagez le QR code à vos invités.",
    videPhotos: "Aucune photo pour l'instant.",
    videVideos: "Aucune vidéo pour l'instant.",
    introuvable: "Événement introuvable",
    refuse: "Accès refusé",
    echecTitre: "Téléchargement impossible",
    echecTexte: "Réessayez dans un instant.",
    archiveTitre: "Archive incomplète",
    archiveTexte: (n: number) => `${n} fichier(s) n'ont pas pu être récupérés.`,
    voirEcartees: (n: number) => `Voir les ${n} photos écartées`,
    retourGalerie: "Revenir à la galerie",
    ecarteesTitre: "Doublons et photos floues",
    ecarteesTexte:
      "Elles ne sont pas supprimées : elles sont simplement rangées à part. Vous les téléchargez comme les autres.",
    videEcartees: "Rien n'a été écarté.",
  },
  en: {
    retour: "Back to dashboard",
    lien: "Link to share with your guests",
    copier: "Copy", copie: "Copied",
    qr: "Your QR code",
    telechargerQR: "Download QR (PNG)",
    signaletique: "My signs to print",
    galerie: "Gallery",
    toutTelecharger: "Download all (ZIP)",
    preparation: "Preparing",
    videTout: "Nothing here yet. Share the QR code with your guests.",
    videPhotos: "No photos yet.",
    videVideos: "No videos yet.",
    introuvable: "Event not found",
    refuse: "Access denied",
    echecTitre: "Download failed",
    echecTexte: "Try again in a moment.",
    archiveTitre: "Incomplete archive",
    archiveTexte: (n: number) => `${n} file(s) could not be retrieved.`,
    voirEcartees: (n: number) => `See the ${n} set-aside photos`,
    retourGalerie: "Back to the gallery",
    ecarteesTitre: "Duplicates and blurry photos",
    ecarteesTexte:
      "They are not deleted, only kept aside. You can download them like the others.",
    videEcartees: "Nothing was set aside.",
  },
};

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
  const { lang } = useLanguage();
  const T = TEXTES[lang === "en" ? "en" : "fr"];
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
  /* Les doublons et les photos floues sont rangés à part, jamais supprimés.
     Ce booléen fait basculer la galerie de l'un à l'autre. */
  const [ecartees, setEcartees] = useState(false);
  const [nbEcartees, setNbEcartees] = useState(0);
  const [avancement, setAvancement] = useState<Avancement | null>(null);
  const [copied, setCopied] = useState(false);
  const [lightbox, setLightbox] = useState<MediaRow | null>(null);
  const [saving, setSaving] = useState(false);

  const saveCurrent = async () => {
    if (!lightbox || saving) return;
    setSaving(true);
    try {
      await downloadMedia(lightbox.url, lightbox.file_name);
    } catch {
      toast({
        title: T.echecTitre,
        description: T.echecTexte,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };
  /* Navigation dans la visionneuse : flèches à l'écran et au clavier. */
  const lightboxIndex = lightbox ? media.findIndex((m) => m.id === lightbox.id) : -1;
  const goRelative = useCallback(
    (delta: number) => {
      if (media.length === 0) return;
      setLightbox((current) => {
        if (!current) return current;
        const i = media.findIndex((m) => m.id === current.id);
        if (i < 0) return current;
        return media[(i + delta + media.length) % media.length];
      });
    },
    [media]
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
      query = ecartees ? query.not("ecarte", "is", null) : query.is("ecarte", null);
      if (activeFilter !== "all") query = query.eq("media_type", activeFilter);
      const { data } = await query
        .order("uploaded_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      const rows = (data ?? []) as MediaRow[];
      setHasMore(rows.length === PAGE_SIZE);
      return rows;
    },
    [id, ecartees]
  );

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const { data: ev, error } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
      if (error || !ev) {
        toast({ title: T.introuvable, variant: "destructive" });
        navigate("/dashboard");
        return;
      }
      if (ev.user_id !== user.id) {
        toast({ title: T.refuse, variant: "destructive" });
        navigate("/dashboard");
        return;
      }
      setEvent(ev);
      const [photoRes, videoRes, ecarteRes] = await Promise.all([
        supabase.from("photos").select("id", { count: "exact", head: true }).eq("event_id", id).eq("media_type", "photo").is("ecarte", null),
        supabase.from("photos").select("id", { count: "exact", head: true }).eq("event_id", id).eq("media_type", "video").is("ecarte", null),
        supabase.from("photos").select("id", { count: "exact", head: true }).eq("event_id", id).not("ecarte", "is", null),
      ]);
      const photo = photoRes.count ?? 0;
      const video = videoRes.count ?? 0;
      setCounts({ photo, video, all: photo + video });
      setNbEcartees(ecarteRes.count ?? 0);
      setMedia(await fetchPage(0, "all"));
      setFetching(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id, navigate, toast, fetchPage]);

  /* Basculer entre la galerie et ce qui en a été écarté. Le rechargement
     passe par fetchPage, qui lit `ecartees` — d'où l'attente d'un tour de
     rendu avant de redemander la première page. */
  const basculerEcartees = () => {
    setMedia([]);
    setHasMore(true);
    setEcartees((v) => !v);
  };

  useEffect(() => {
    if (fetching) return;
    let vivant = true;
    (async () => {
      setLoadingMore(true);
      const rows = await fetchPage(0, filter);
      if (vivant) setMedia(rows);
      setLoadingMore(false);
    })();
    return () => { vivant = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ecartees]);

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

  /* Toute la galerie, pour le couple, depuis un ordinateur.
   *
   * Cette fonction chargeait auparavant tous les fichiers en mémoire avant de
   * fabriquer l'archive : sur un vrai mariage, plus de deux gigaoctets d'un
   * seul tenant, et l'onglet se fermait sans un mot. Ce n'était pas un cas
   * limite, c'était le cas normal.
   *
   * Les invités, eux, n'ont pas d'archive du tout : ils sélectionnent ce qu'ils
   * veulent et l'enregistrent dans leur pellicule. Le zip n'a de sens que
   * pour les hôtes, sur un ordinateur, et une seule fois. */
  const downloadZip = async () => {
    if (zipping) return;
    setZipping(true);
    try {
      const { data } = await supabase
        .from("photos")
        .select("url, file_name")
        .eq("event_id", id)
        .order("created_at", { ascending: true });
      const fichiers = (data ?? []).map((m, n) => ({
        url: m.url as string,
        nom: (m.file_name as string) || `photo-${n + 1}.jpg`,
      }));
      if (fichiers.length === 0) return;
      const echecs = await telechargerEnLots(
        fichiers,
        (event?.name || "souvenirs").replace(/\s+/g, "-").toLowerCase(),
        setAvancement,
      );
      if (echecs > 0) {
        toast({
          title: T.archiveTitre,
          description: T.archiveTexte(echecs),
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: T.echecTitre,
        description: String((err as Error).message ?? err),
        variant: "destructive",
      });
    } finally {
      setAvancement(null);
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
            <ArrowLeft className="w-4 h-4" /> {T.retour}
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-border px-3 py-1 text-xs font-medium text-muted-foreground capitalize inline-block mb-3">
                {event.event_type}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-3">
                <span>{event.name}</span>
              </h1>
              <div className="flex items-center gap-2 text-muted-foreground mb-6">
                <Calendar className="w-5 h-5" />
                {new Date(event.event_date).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </div>
              <div className="p-6 bg-card rounded-2xl rounded-xl border border-border shadow-soft">
                <p className="text-sm text-muted-foreground mb-2">{T.lien}</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <code className="flex-1 px-4 py-2 bg-muted rounded-lg text-sm break-all">{guestUrl}</code>
                  <Button variant="outline" onClick={copyLink}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? T.copie : T.copier}
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gradient-card rounded-2xl rounded-full border border-primary/30 shadow-card text-center">
              <p className="text-sm font-medium text-muted-foreground mb-4">{T.qr}</p>
              <div ref={qrRef} className="bg-white p-4 rounded-xl inline-block mb-4">
                <QRCodeCanvas value={guestUrl} size={180} level="H" />
              </div>
              <Button variant="hero" className="w-full" onClick={downloadQR}>
                <Download className="w-4 h-4" /> {T.telechargerQR}
              </Button>
              {/* Le PNG seul ne suffit pas : personne ne sait mettre en page un
                  panneau d'accueil dans un traitement de texte. */}
              <Button asChild variant="outline" className="mt-2 w-full">
                <Link to={`/dashboard/event/${id}/signaletique`}>{T.signaletique}</Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
            <h2 className="text-2xl font-bold">
              {T.galerie} <span className="text-muted-foreground text-lg font-normal">({counts.all})</span>
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <MediaTabs value={filter} onChange={changeFilter} counts={counts} />
              <Button variant="outline" onClick={downloadZip} disabled={zipping || counts.all === 0}>
                <Download className="w-4 h-4" /> {avancement ? `${T.preparation} ${avancement.faits}/${avancement.total}` : zipping ? `${T.preparation}…` : T.toutTelecharger}
              </Button>
            </div>
          </div>

          {/* Le tri se voit, et se défait. Un doublon n'en est peut-être pas
              un, une photo jugée floue peut être la seule où figure quelqu'un :
              rien n'est supprimé, tout se réaffiche d'un bouton. */}
          {(nbEcartees > 0 || ecartees) && (
            <div className="mb-6 rounded-xl border border-border bg-card px-4 py-3">
              <button
                type="button"
                onClick={basculerEcartees}
                className="label-mono border-b border-foreground pb-1 text-foreground"
              >
                {ecartees ? T.retourGalerie : T.voirEcartees(nbEcartees)}
              </button>
              {ecartees && (
                <p className="mt-3 max-w-[60ch] text-sm text-muted-foreground">
                  {T.ecarteesTexte}
                </p>
              )}
            </div>
          )}

          {media.length === 0 && !loadingMore ? (
            <div className="text-center py-16 bg-card rounded-2xl rounded-xl border border-border">
              <p className="text-muted-foreground">
                {ecartees
                  ? T.videEcartees
                  : filter === "video" ? T.videVideos : filter === "photo" ? T.videPhotos : T.videTout}
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
                  className="relative w-full overflow-hidden rounded-xl bg-muted rounded-xl border border-border shadow-soft hover:shadow-card hover:-translate-y-1 transition-all duration-300"
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
              ))}
            </div>
          )}
          <div ref={sentinelRef} className="h-10 flex items-center justify-center">
            {loadingMore && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
          </div>

          {PLANS_AVEC_LIVRE_DOR.includes(event.plan) && (
            <LivreDorHote eventId={event.id} lang={lang} />
          )}

          <ReglagesEvenement
            eventId={event.id}
            eventDate={event.event_date}
            lang={lang}
            livreDorInclus={PLANS_AVEC_LIVRE_DOR.includes(event.plan)}
            valeurs={{
              message_accueil: event.message_accueil,
              collecte_fin: event.collecte_fin,
              livre_dor_actif: event.livre_dor_actif,
              livre_dor_vocal: event.livre_dor_vocal,
              livre_dor_public: event.livre_dor_public,
            }}
            onEnregistre={(r: Reglages) =>
              setEvent((prev) => (prev ? { ...prev, ...r } : prev))
            }
          />
        </div>

        {lightbox && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-fade-in"
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
              {saving ? "Préparation…" : "Enregistrer"}
            </button>

            <button
              type="button"
              aria-label="Fermer"
              onClick={() => setLightbox(null)}
              className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center border border-white/40 text-white transition-colors hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
            {media.length > 1 && (
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
                  {lightboxIndex + 1} / {media.length}
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
                className="max-h-[90vh] max-w-full rounded-xl"
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
      </main>
      <Footer />
    </div>
  );
};

export default EventDetail;
