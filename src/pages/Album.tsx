import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { gridUrl, fallbackToOriginal } from "@/lib/imageUrl";
import { envoyerSurR2, extensionDe } from "@/lib/r2";
import { compressImage } from "@/lib/imageCompression";
import { telechargerEnLots, type Avancement, type FichierATelecharger } from "@/lib/telechargerLot";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FaceSearch from "@/components/FaceSearch";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  ArrowLeft, Check, ChevronLeft, ChevronRight, Download, Loader2, Lock, Plus, Printer,
  Sparkles, Trash2, Upload, Quote,
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
 *
 * La fin du parcours compte autant que le début : les mariés valident leur
 * album, l'administratrice reçoit un e-mail, télécharge les fichiers numérotés
 * dans l'ordre des pages et les envoie à l'imprimeur. Tant que l'album n'est
 * pas parti à l'impression, les mariés peuvent le rouvrir.
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
    valider: "Valider mon album",
    validerConfirme:
      "Une fois validé, l'album part en préparation pour l'impression et ne se modifie plus. Vous pourrez le rouvrir tant qu'il n'est pas envoyé à l'imprimeur. Valider ?",
    valideLe: "Album validé le",
    valideTexte:
      "Nous le préparons pour l'impression.",
    rouvrir: "Rouvrir pour modifier",
    imprimeLe: "Envoyé à l'impression le",
    imprimeTexte: "L'album est en fabrication : il ne peut plus être modifié.",
    exporter: "Télécharger pour l'impression",
    exporterAide: "Les fichiers en qualité d'origine, numérotés dans l'ordre des pages.",
    marquerImprime: "Marquer comme envoyé à l'impression",
    annulerImprime: "Annuler « envoyé à l'impression »",
    nonInclus: "La composition de l'album est comprise dans la formule Héritage, ou avec l'album commandé depuis votre espace.",
    erreur: "L'opération n'a pas abouti. Réessayez dans un instant.",
    importEchecs: "fichier(s) n'ont pas pu être ajoutés.",
    exportEchecs: "fichier(s) n'ont pas pu être récupérés.",
    preparation: "Préparation",
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
    valider: "Approve my album",
    validerConfirme:
      "Once approved, the album goes into preparation for print and can no longer be edited. You can reopen it as long as it has not been sent to the printer. Approve?",
    valideLe: "Album approved on",
    valideTexte: "We are preparing it for print.",
    rouvrir: "Reopen to edit",
    imprimeLe: "Sent to print on",
    imprimeTexte: "The album is being made: it can no longer be edited.",
    exporter: "Download for print",
    exporterAide: "Original-quality files, numbered in page order.",
    marquerImprime: "Mark as sent to print",
    annulerImprime: "Undo “sent to print”",
    nonInclus: "Building the album is included in the Heritage plan, or with an album ordered from your space.",
    erreur: "That did not go through. Try again in a moment.",
    importEchecs: "file(s) could not be added.",
    exportEchecs: "file(s) could not be fetched.",
    preparation: "Preparing",
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
  livre_dor?: {
    auteur: string; texte: string | null; photo_url?: string | null; photo_thumb_url: string | null;
  } | null;
}

interface EtatAlbum {
  plan: string;
  album_achete?: boolean;
  albums_offerts?: boolean;
  album_valide_le: string | null;
  album_imprime_le: string | null;
}

const albumOuvert = (e: EtatAlbum) =>
  ["heritage", "admin"].includes(e.plan) || Boolean(e.album_achete) || Boolean(e.albums_offerts);

/** Un nom de fichier sans accents ni caractères qui gênent un imprimeur. */
const slug = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "").slice(0, 40) || "invite";

const extensionUrl = (url: string) => {
  const m = /\.([a-z0-9]{2,5})(?:\?|$)/i.exec(url);
  return m ? m[1].toLowerCase() : "jpg";
};

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

  const [etat, setEtat] = useState<EtatAlbum | null>(null);
  const [admin, setAdmin] = useState(false);
  const [alerte, setAlerte] = useState<string | null>(null);
  const [avancement, setAvancement] = useState<Avancement | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  const chargerEtat = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from("events")
      .select("plan, album_valide_le, album_imprime_le, album_achete, albums_offerts")
      .eq("id", id)
      .maybeSingle();
    setEtat((data as EtatAlbum | null) ?? null);
  }, [id]);

  useEffect(() => {
    void chargerEtat();
    supabase.rpc("est_admin").then(({ data }) => setAdmin(data === true));
  }, [chargerEtat]);

  const charger = useCallback(async () => {
    if (!id) return;
    setChargement(true);
    const { data } = await supabase
      .from("album_pages")
      .select(
        "id, position, genre, photo_id, externe_url, externe_thumb, message_id, " +
          "photos(url, thumbnail_url, file_name), livre_dor(auteur, texte, photo_url, photo_thumb_url)"
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
    setAlerte(null);
    const g = graine + 1;
    setGraine(g);
    const { error } = await supabase.rpc("album_composer", {
      p_event: id,
      p_cible: cible,
      p_graine: g,
      p_prioritaires: prioritaires,
    });
    if (error) setAlerte(t.erreur);
    setTravail(false);
    void charger();
  };

  const retirer = async (pageId: string) => {
    setPages((p) => p.filter((x) => x.id !== pageId));
    const { error } = await supabase.from("album_pages").delete().eq("id", pageId);
    if (error) { setAlerte(t.erreur); void charger(); }
  };

  const deplacer = async (index: number, sens: -1 | 1) => {
    const cible2 = index + sens;
    if (cible2 < 0 || cible2 >= pages.length || !id) return;
    const copie = [...pages];
    [copie[index], copie[cible2]] = [copie[cible2], copie[index]];
    setPages(copie);
    const { error } = await supabase.rpc("album_reordonner", {
      p_event: id,
      p_ordre: copie.map((p) => p.id),
    });
    if (error) { setAlerte(t.erreur); void charger(); }
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
    const { error } = await supabase.from("album_pages").insert({
      event_id: id,
      position: pages.length + 1,
      ...champs,
    } as never);
    if (error) setAlerte(t.erreur);
    void charger();
  };

  /* Les photos apportées par les mariés passent par le même stockage que
     celles des invités, mais n'entrent jamais dans la table « photos » : elles
     ne doivent pas apparaître dans la galerie ni dans le diaporama. */
  /* Le chemin doit suivre le format que la fonction de signature accepte —
     `<événement>/<uuid>.<ext>` et `<événement>/<uuid>-thumb.<ext>`. La première
     version rangeait ces fichiers dans un sous-dossier `album/` : chaque envoi
     était refusé par le serveur, et l'erreur, avalée, ne se voyait nulle part. */
  const importer = async (fichiers: FileList | null) => {
    if (!fichiers || !id) return;
    setTravail(true);
    setAlerte(null);
    let echecs = 0;
    let position = pages.length;
    for (const fichier of Array.from(fichiers)) {
      try {
        const { full, thumb, fallback } = await compressImage(fichier);
        const uuid = crypto.randomUUID();
        const type = fallback ? fichier.type || "image/jpeg" : "image/jpeg";
        const url = await envoyerSurR2({
          eventId: id, chemin: `${id}/${uuid}.${extensionDe(type)}`, fichier: full, contentType: type,
        });
        let vignette: string | null = null;
        if (thumb) {
          try {
            vignette = await envoyerSurR2({
              eventId: id, chemin: `${id}/${uuid}-thumb.jpg`, fichier: thumb, contentType: "image/jpeg",
            });
          } catch {
            /* Sans vignette, l'aperçu montrera l'image entière. */
          }
        }
        position += 1;
        const { error } = await supabase.from("album_pages").insert({
          event_id: id, position, genre: "externe",
          externe_url: url, externe_thumb: vignette,
        } as never);
        if (error) throw error;
      } catch {
        /* Un fichier illisible ne doit pas interrompre les autres. */
        echecs += 1;
      }
    }
    if (echecs > 0) setAlerte(`${echecs} ${t.importEchecs}`);
    setTravail(false);
    void charger();
  };

  /* ── La fin du parcours : valider, rouvrir, exporter, marquer imprimé ── */

  const valider = async () => {
    if (!id || !window.confirm(t.validerConfirme)) return;
    setTravail(true);
    setAlerte(null);
    const { error } = await supabase.rpc("album_valider", { p_event: id });
    if (error) setAlerte(t.erreur);
    setTravail(false);
    void chargerEtat();
  };

  const rouvrir = async () => {
    if (!id) return;
    setTravail(true);
    const { error } = await supabase.rpc("album_rouvrir", { p_event: id });
    if (error) setAlerte(t.erreur);
    setTravail(false);
    void chargerEtat();
  };

  const marquerImprime = async (imprime: boolean) => {
    if (!id) return;
    setTravail(true);
    const { error } = await supabase.rpc("album_marquer_imprime", { p_event: id, p_imprime: imprime });
    if (error) setAlerte(t.erreur);
    setTravail(false);
    void chargerEtat();
  };

  /* Les fichiers partent en qualité d'origine, numérotés 001, 002… dans
     l'ordre des pages. Un mot du livre d'or devient un fichier texte au même
     numéro, avec la photo de son auteur s'il en a joint une : c'est ce dont
     on a besoin pour monter la page dans l'outil de l'imprimeur. */
  const exporter = async () => {
    const fichiers: FichierATelecharger[] = [];
    const textes: string[] = [];
    pages.forEach((p, i) => {
      const n = String(i + 1).padStart(3, "0");
      if (p.genre === "message" && p.livre_dor) {
        const auteur = p.livre_dor.auteur;
        const contenu = `${p.livre_dor.texte ?? ""}\n\n${auteur}\n`;
        fichiers.push({
          url: URL.createObjectURL(new Blob([contenu], { type: "text/plain;charset=utf-8" })),
          nom: `${n}-mot-de-${slug(auteur)}.txt`,
        });
        const photo = p.livre_dor.photo_url ?? p.livre_dor.photo_thumb_url;
        if (photo) fichiers.push({ url: photo, nom: `${n}-photo-de-${slug(auteur)}.${extensionUrl(photo)}` });
        textes.push(`${n}  mot du livre d'or, ${auteur}`);
        return;
      }
      const url = p.genre === "externe" ? p.externe_url : p.photos?.url;
      if (!url) return;
      fichiers.push({ url, nom: `${n}.${extensionUrl(url)}` });
      textes.push(`${n}  ${p.genre === "externe" ? "photo apportée par les mariés" : p.photos?.file_name ?? "photo"}`);
    });
    fichiers.unshift({
      url: URL.createObjectURL(new Blob([`Album, ${pages.length} pages\n\n${textes.join("\n")}\n`], {
        type: "text/plain;charset=utf-8",
      })),
      nom: "000-sommaire.txt",
    });

    setAlerte(null);
    setAvancement({ faits: 0, total: fichiers.length, lot: 1, lots: 1 });
    const echecs = await telechargerEnLots(fichiers, `album-${id?.slice(0, 8)}`, setAvancement);
    setAvancement(null);
    fichiers.forEach((f) => f.url.startsWith("blob:") && URL.revokeObjectURL(f.url));
    if (echecs > 0) setAlerte(`${echecs} ${t.exportEchecs}`);
  };

  const valide = Boolean(etat?.album_valide_le);
  const imprime = Boolean(etat?.album_imprime_le);
  /* Les mariés ne modifient plus un album validé ; l'administratrice, si,
     pour corriger une page avant l'envoi à l'imprimeur. */
  const modifiable = !imprime && (!valide || admin);
  const dateFr = (d: string) =>
    new Date(d).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", {
      day: "numeric", month: "long", year: "numeric",
    });

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

        {etat && !albumOuvert(etat) && !admin && (
          <p className="mt-6 border border-border bg-card p-5 text-muted-foreground">{t.nonInclus}</p>
        )}

        {(valide || imprime) && (
          <div className="mt-8 border border-primary bg-card p-5">
            <p className="label-mono inline-flex items-center gap-2 text-primary">
              {imprime ? <Printer className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {imprime
                ? `${t.imprimeLe} ${dateFr(etat!.album_imprime_le!)}`
                : `${t.valideLe} ${dateFr(etat!.album_valide_le!)}`}
            </p>
            <p className="mt-2 text-[15px]">{imprime ? t.imprimeTexte : t.valideTexte}</p>
            {!imprime && (
              <button type="button" disabled={travail} onClick={() => void rouvrir()}
                className="label-mono mt-4 min-h-[44px] border-b border-foreground pb-0.5 hover:opacity-60">
                {t.rouvrir}
              </button>
            )}
          </div>
        )}

        {alerte && (
          <p className="mt-6 border-l-2 border-destructive pl-3 text-sm text-destructive">{alerte}</p>
        )}

        {(etat && (albumOuvert(etat) || admin)) && (
        <>

        {modifiable && (
        <>
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
              type="number" min={20} max={80} step={10} value={cible}
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
        </>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <p className="label-mono mr-auto">{pages.length} {t.pages}</p>
          {!valide && pages.length > 0 && (
            <Button variant="hero" disabled={travail} onClick={() => void valider()}>
              <Check className="h-4 w-4" /> {t.valider}
            </Button>
          )}
          {(valide || admin) && pages.length > 0 && (
            <Button variant="outline" disabled={avancement !== null} onClick={() => void exporter()}>
              {avancement ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {avancement ? `${t.preparation} ${avancement.faits}/${avancement.total}` : t.exporter}
            </Button>
          )}
          {admin && valide && (
            <Button variant="outline" disabled={travail} onClick={() => void marquerImprime(!imprime)}>
              <Printer className="h-4 w-4" /> {imprime ? t.annulerImprime : t.marquerImprime}
            </Button>
          )}
        </div>
        {(valide || admin) && pages.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">{t.exporterAide}</p>
        )}

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
                {modifiable && (
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
                )}
              </li>
            ))}
          </ol>
        )}

        </>
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
