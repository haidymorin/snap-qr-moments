import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { gridUrl, fallbackToOriginal } from "@/lib/imageUrl";
import { envoyerSurR2, extensionDe } from "@/lib/r2";
import { compressImage } from "@/lib/imageCompression";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FaceSearch from "@/components/FaceSearch";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Loader2, Plus, Sparkles, Trash2, Upload, Quote,
} from "lucide-react";

/* La composition de l'album.
 *
 * L'écran est bâti sur une idée simple : les mariés n'ouvrent jamais une page
 * blanche. À l'arrivée, le site a déjà proposé une sélection étalée sur toute
 * la journée. Tout ce qui suit — retirer, ajouter, déplacer, relancer — ne
 * fait que corriger un point de départ qui existe.
 *
 * Trois sources se mélangent dans le même album, et c'est le point important :
 * les photos des invités, celles que les mariés apportent (le photographe, un
 * proche), et les mots du livre d'or posés en face de la photo de leur auteur.
 *
 * Le réordonnancement se fait par deux flèches et non par glisser-déposer.
 * C'est moins élégant, et c'est un choix : le glisser-déposer est pénible au
 * doigt sur une liste de soixante vignettes, et la moitié des mariés fera ça
 * depuis un canapé, sur un téléphone.
 */

const T = {
  fr: {
    retour: "Retour à l'événement",
    titre: "Composer l'album",
    chapo:
      "Le site vous propose une première sélection, étalée sur toute la journée : les photos les plus nettes, sans les doublons. Gardez-la, relancez-la, ou composez la vôtre.",
    proposer: "Proposer une sélection",
    reproposer: "Proposer une autre sélection",
    confirmer:
      "Cela remplacera l'album actuel par une nouvelle proposition. Vos ajouts personnels seront retirés. Continuer ?",
    pages: "pages",
    vide: "Votre album est vide. Lancez une proposition, ou ajoutez vos photos une par une.",
    galerie: "Ajouter depuis la galerie",
    externes: "Ajouter mes propres photos",
    externesAide:
      "Celles du photographe, ou celles qu'on vous a envoyées. Elles entrent dans l'album sans apparaître dans la galerie de vos invités.",
    messages: "Ajouter un mot du livre d'or",
    messagesAide: "Le message se pose en face de la photo de son auteur.",
    fermer: "Fermer",
    envoi: "Envoi…",
    nombre: "Nombre de pages souhaité",
    visagesAide:
      "Lancez la recherche par visage avant de demander une proposition : le site donnera la priorité aux photos où vous apparaissez.",
    prioritaires: "photos où vous apparaissez seront privilégiées",
  },
  en: {
    retour: "Back to the event",
    titre: "Build the album",
    chapo:
      "The site suggests a first selection spread across the whole day: the sharpest photos, without duplicates. Keep it, regenerate it, or build your own.",
    proposer: "Suggest a selection",
    reproposer: "Suggest another selection",
    confirmer:
      "This will replace the current album with a new suggestion. Your own additions will be removed. Continue?",
    pages: "pages",
    vide: "Your album is empty. Start a suggestion, or add your photos one by one.",
    galerie: "Add from the gallery",
    externes: "Add my own photos",
    externesAide:
      "The photographer's, or the ones people sent you. They go into the album without appearing in your guests' gallery.",
    messages: "Add a guest book message",
    messagesAide: "The message sits facing its author's photo.",
    fermer: "Close",
    envoi: "Uploading…",
    nombre: "Number of pages wanted",
    visagesAide:
      "Run the face search before asking for a suggestion: the site will favour photos you appear in.",
    prioritaires: "photos you appear in will be favoured",
  },
};

interface Page {
  id: string;
  position: number;
  genre: string;
  photo_id: string | null;
  externe_url: string | null;
  externe_thumb: string | null;
  message_id: string | null;
  photos?: { url: string; thumbnail_url: string | null; file_name: string } | null;
  livre_dor?: { auteur: string; texte: string | null; photo_thumb_url: string | null } | null;
}

interface PhotoLigne {
  id: string;
  url: string;
  thumbnail_url: string | null;
  file_name: string;
}

interface MessageLigne {
  id: string;
  auteur: string;
  texte: string | null;
  photo_thumb_url: string | null;
}

const Album = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const t = T[lang === "en" ? "en" : "fr"];

  const [pages, setPages] = useState<Page[]>([]);
  const [chargement, setChargement] = useState(true);
  const [travail, setTravail] = useState(false);
  const [cible, setCible] = useState(60);
  const [graine, setGraine] = useState(0);
  const [prioritaires, setPrioritaires] = useState<string[]>([]);

  const [panneau, setPanneau] = useState<"galerie" | "messages" | null>(null);
  const [galerie, setGalerie] = useState<PhotoLigne[]>([]);
  const [messages, setMessages] = useState<MessageLigne[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  const charger = useCallback(async () => {
    if (!id) return;
    setChargement(true);
    const { data } = await supabase
      .from("album_pages")
      .select(
        "id, position, genre, photo_id, externe_url, externe_thumb, message_id, " +
          "photos(url, thumbnail_url, file_name), livre_dor(auteur, texte, photo_thumb_url)"
      )
      .eq("event_id", id)
      .order("position");
    setPages((data as unknown as Page[]) ?? []);
    setChargement(false);
  }, [id]);

  useEffect(() => { void charger(); }, [charger]);

  /* La proposition. On garde la graine précédente en mémoire pour que
     « proposer autre chose » propose vraiment autre chose. */
  const proposer = async () => {
    if (!id) return;
    if (pages.length > 0 && !window.confirm(t.confirmer)) return;
    setTravail(true);
    const g = graine + 1;
    setGraine(g);
    await supabase.rpc("album_composer", {
      p_event: id,
      p_cible: cible,
      p_graine: g,
      p_prioritaires: prioritaires,
    });
    setTravail(false);
    void charger();
  };

  const retirer = async (pageId: string) => {
    setPages((p) => p.filter((x) => x.id !== pageId));
    await supabase.from("album_pages").delete().eq("id", pageId);
  };

  const deplacer = async (index: number, sens: -1 | 1) => {
    const cible2 = index + sens;
    if (cible2 < 0 || cible2 >= pages.length || !id) return;
    const copie = [...pages];
    [copie[index], copie[cible2]] = [copie[cible2], copie[index]];
    setPages(copie);
    await supabase.rpc("album_reordonner", {
      p_event: id,
      p_ordre: copie.map((p) => p.id),
    });
  };

  const ouvrirGalerie = async () => {
    setPanneau("galerie");
    if (galerie.length || !id) return;
    const { data } = await supabase
      .from("photos")
      .select("id, url, thumbnail_url, file_name")
      .eq("event_id", id)
      .eq("media_type", "photo")
      .is("ecarte", null)
      .order("uploaded_at");
    setGalerie((data as PhotoLigne[] | null) ?? []);
  };

  const ouvrirMessages = async () => {
    setPanneau("messages");
    if (messages.length || !id) return;
    const { data } = await supabase
      .from("livre_dor")
      .select("id, auteur, texte, photo_thumb_url")
      .eq("event_id", id)
      .eq("masque", false)
      .not("texte", "is", null)
      .order("created_at");
    setMessages((data as MessageLigne[] | null) ?? []);
  };

  const ajouter = async (champs: Partial<Page> & { genre: string }) => {
    if (!id) return;
    await supabase.from("album_pages").insert({
      event_id: id,
      position: pages.length + 1,
      ...champs,
    } as never);
    void charger();
  };

  /* Les photos apportées par les mariés passent par le même stockage que
     celles des invités, mais n'entrent jamais dans la table « photos » : elles
     ne doivent pas apparaître dans la galerie ni dans le diaporama. */
  const importer = async (fichiers: FileList | null) => {
    if (!fichiers || !id) return;
    setTravail(true);
    for (const fichier of Array.from(fichiers)) {
      try {
        const { full, thumb } = await compressImage(fichier);
        const base = `${id}/album/${crypto.randomUUID()}`;
        const ext = extensionDe(fichier.type || "image/jpeg");
        const url = await envoyerSurR2({
          eventId: id, chemin: `${base}.${ext}`, fichier: full, contentType: "image/jpeg",
        });
        let vignette: string | null = null;
        if (thumb) {
          vignette = await envoyerSurR2({
            eventId: id, chemin: `${base}-v.${ext}`, fichier: thumb, contentType: "image/jpeg",
          });
        }
        await supabase.from("album_pages").insert({
          event_id: id, position: pages.length + 1, genre: "externe",
          externe_url: url, externe_thumb: vignette,
        } as never);
      } catch {
        /* Un fichier illisible ne doit pas interrompre les autres. */
      }
    }
    setTravail(false);
    void charger();
  };

  const apercu = (p: Page) => {
    if (p.genre === "externe") return p.externe_thumb ?? p.externe_url ?? undefined;
    if (p.genre === "message") return p.livre_dor?.photo_thumb_url ?? undefined;
    return gridUrl(p.photos?.thumbnail_url ?? p.photos?.url);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container mx-auto flex-1 px-4 py-10">
        <Link to={`/dashboard/event/${id}`} className="label-mono inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> {t.retour}
        </Link>

        <h1 className="mt-6 text-[clamp(28px,4vw,44px)]">{t.titre}</h1>
        <p className="mt-3 max-w-[64ch] text-muted-foreground">{t.chapo}</p>

        {/* La recherche par visage sert ici à orienter la proposition : elle ne
            filtre rien, elle donne une liste de photos à privilégier. */}
        <div className="mt-8 rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">{t.visagesAide}</p>
          <FaceSearch
            eventId={id!}
            onResultats={(photos) => setPrioritaires((photos ?? []).map((p) => p.id))}
          />
          {prioritaires.length > 0 && (
            <p className="label-mono mt-3 text-primary">
              {prioritaires.length} {t.prioritaires}
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-end gap-4">
          <label>
            <span className="label-mono">{t.nombre}</span>
            <input
              type="number" min={20} max={120} step={10} value={cible}
              onChange={(e) => setCible(Number(e.target.value))}
              className="mt-1 block w-28 rounded-xl border border-border bg-background p-2.5"
            />
          </label>
          <Button variant="hero" disabled={travail} onClick={() => void proposer()}>
            {travail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {pages.length ? t.reproposer : t.proposer}
          </Button>
          <Button variant="outline" onClick={() => void ouvrirGalerie()}>
            <Plus className="h-4 w-4" /> {t.galerie}
          </Button>
          <Button variant="outline" onClick={() => void ouvrirMessages()}>
            <Quote className="h-4 w-4" /> {t.messages}
          </Button>
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-border px-4 text-sm">
            <Upload className="h-4 w-4" /> {t.externes}
            <input type="file" accept="image/*" multiple hidden
              onChange={(e) => void importer(e.target.files)} />
          </label>
        </div>
        <p className="mt-2 max-w-[64ch] text-xs text-muted-foreground">{t.externesAide}</p>

        <p className="label-mono mt-8">{pages.length} {t.pages}</p>

        {chargement ? (
          <Loader2 className="mt-6 h-6 w-6 animate-spin text-muted-foreground" />
        ) : pages.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
            {t.vide}
          </p>
        ) : (
          <ol className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {pages.map((p, i) => (
              <li key={p.id} className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="relative aspect-square bg-muted">
                  {p.genre === "message" && !p.livre_dor?.photo_thumb_url ? (
                    <p className="line-clamp-6 p-3 text-[13px] italic">
                      « {p.livre_dor?.texte} »
                    </p>
                  ) : (
                    <img
                      src={apercu(p)}
                      onError={(e) => fallbackToOriginal(e, p.photos?.url ?? p.externe_url)}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                  <span className="label-mono absolute left-2 top-2 rounded bg-background/85 px-1.5">
                    {i + 1}
                  </span>
                </div>
                <div className="flex items-center justify-between px-2 py-1.5">
                  <div className="flex gap-1">
                    <button type="button" aria-label="Reculer" onClick={() => void deplacer(i, -1)}
                      className="rounded p-1 hover:bg-muted">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label="Avancer" onClick={() => void deplacer(i, 1)}
                      className="rounded p-1 hover:bg-muted">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <button type="button" aria-label="Retirer" onClick={() => void retirer(p.id)}
                    className="rounded p-1 text-destructive hover:bg-muted">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}

        {panneau && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-background/97 p-6">
            <div className="mx-auto max-w-5xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl">{panneau === "galerie" ? t.galerie : t.messages}</h2>
                <Button variant="outline" onClick={() => setPanneau(null)}>{t.fermer}</Button>
              </div>
              {panneau === "messages" && (
                <p className="mt-2 text-sm text-muted-foreground">{t.messagesAide}</p>
              )}

              {panneau === "galerie" ? (
                <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
                  {galerie.map((g) => (
                    <button key={g.id} type="button"
                      onClick={() => void ajouter({ genre: "photo", photo_id: g.id })}
                      className="aspect-square overflow-hidden rounded-lg border border-border">
                      <img src={gridUrl(g.thumbnail_url ?? g.url)} alt={g.file_name}
                        loading="lazy" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : (
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {messages.map((m) => (
                    <li key={m.id}>
                      <button type="button"
                        onClick={() => void ajouter({ genre: "message", message_id: m.id })}
                        className="w-full rounded-xl border border-border bg-card p-4 text-left">
                        <p className="line-clamp-4 text-[15px] italic">« {m.texte} »</p>
                        <p className="label-mono mt-2">{m.auteur}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Album;
