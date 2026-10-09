import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { envoyerSurR2, extensionDe, typeDeclare } from "@/lib/r2";
import { generateVideoPoster } from "@/lib/videoPoster";
import { compressImage } from "@/lib/imageCompression";
import {
  demarrerEnregistrement, enregistrementDisponible, type SessionEnregistrement,
} from "@/lib/enregistreurVocal";
import { ArrowRight, Image as ImageIcon, Loader2, Mic, Pause, PenLine, Play, Square, Trash2, Video, X } from "lucide-react";

/* Le livre d'or, côté invité.
 *
 * Un mot, une voix ou une vidéo, et une photo si on veut. Rien d'autre : pas de compte,
 * pas d'adresse e-mail, pas de mot de passe. Quelqu'un qui a envie d'écrire à
 * un couple le fait dans la minute ou ne le fait pas — chaque champ ajouté ici
 * coûte des messages.
 *
 * Le prénom est le seul renseignement demandé, et il est indispensable : un
 * livre d'or anonyme n'a aucune valeur le jour où on l'imprime.
 *
 * La vidéo passe par la caméra du téléphone lui-même (champ fichier avec
 * `capture`), pas par un enregistreur maison dans la page : c'est l'appareil
 * photo que tout le monde sait déjà utiliser, il marche sur tous les
 * téléphones, et il ne plante pas au milieu d'un message de deux minutes.
 */

/** Trois minutes : un message, pas un film. Revérifié par la base. */
const VIDEO_MAX_SECONDES = 180;
/** Le même plafond que les vidéos de la galerie. */
const VIDEO_MAX_OCTETS = 500 * 1024 * 1024;

const TEXTES = {
  fr: {
    titre: "Le livre d'or",
    intro: "Laissez un mot aux mariés. Quelques lignes, votre voix ou une vidéo.",
    introAutre: "Laissez un mot aux hôtes. Quelques lignes, votre voix ou une vidéo.",
    prive: "Vos messages ne sont lus que par eux.",
    prenom: "Votre prénom",
    ecrire: "Écrire",
    parler: "Ma voix",
    filmer: "En vidéo",
    videoDemarrer: "Filmer mon message",
    videoAide: "Trois minutes au plus. Votre téléphone ouvre sa caméra : filmez, puis validez.",
    videoRefaire: "Refilmer",
    videoTropLongue: "Cette vidéo dure plus de trois minutes. Refilmez un message plus court.",
    videoTropLourde: "Cette vidéo est trop lourde pour être envoyée. Refilmez un message plus court.",
    videoEnvoi: "Envoi de la vidéo",
    message: "Votre message",
    messagePlaceholder: "Ce que vous avez envie de leur dire…",
    micDemarrer: "Appuyez pour enregistrer",
    micArreter: "Terminer",
    micRefait: "Recommencer",
    micRefuse: "Le micro n'est pas accessible. Autorisez-le dans les réglages de votre navigateur, ou écrivez votre message.",
    photo: "Joindre une photo",
    photoRetirer: "Retirer la photo",
    envoyer: "Laisser mon message",
    envoi: "Envoi…",
    merci: "Merci. Votre message est arrivé.",
    autre: "En laisser un autre",
    erreur: "Le message n'est pas parti. Réessayez.",
    aucun: "Personne n'a encore écrit. Soyez le premier.",
    parLe: "le",
    voirPlus: "Voir les messages plus anciens",
  },
  en: {
    titre: "The guest book",
    intro: "Leave a word for the couple. A few lines, your voice or a video.",
    introAutre: "Leave a word for the hosts. A few lines, your voice or a video.",
    prive: "Only they will read your message.",
    prenom: "Your first name",
    ecrire: "Write",
    parler: "My voice",
    filmer: "Video",
    videoDemarrer: "Film my message",
    videoAide: "Three minutes at most. Your phone opens its camera: film, then confirm.",
    videoRefaire: "Film again",
    videoTropLongue: "This video is longer than three minutes. Please film a shorter message.",
    videoTropLourde: "This video is too large to send. Please film a shorter message.",
    videoEnvoi: "Sending the video",
    message: "Your message",
    messagePlaceholder: "What you feel like telling them…",
    micDemarrer: "Tap to record",
    micArreter: "Done",
    micRefait: "Start again",
    micRefuse: "The microphone is not available. Allow it in your browser settings, or write your message instead.",
    photo: "Attach a photo",
    photoRetirer: "Remove photo",
    envoyer: "Leave my message",
    envoi: "Sending…",
    merci: "Thank you. Your message arrived.",
    autre: "Leave another one",
    erreur: "The message did not go through. Try again.",
    aucun: "Nobody has written yet. Be the first.",
    parLe: "on",
    voirPlus: "See older messages",
  },
};

export interface Message {
  id: string;
  auteur: string;
  texte: string | null;
  audio_url: string | null;
  audio_secondes: number | null;
  video_url?: string | null;
  video_poster_url?: string | null;
  video_secondes?: number | null;
  photo_url: string | null;
  photo_thumb_url: string | null;
  created_at: string;
}

interface Props {
  eventId: string;
  /** Les invités lisent-ils les messages des autres ? */
  messagesPublics: boolean;
  /** Les messages vocaux sont-ils autorisés sur cet événement ? */
  vocalAutorise: boolean;
  typeEvenement: string;
}

const PAGE = 20;

const duree = (s: number | null) => {
  const n = Math.max(0, s ?? 0);
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
};

/* Un seul lecteur à la fois : deux voix qui se parlent dessus, personne
   n'écoute ni l'une ni l'autre. */
const LecteurVocal = ({ url, secondes }: { url: string; secondes: number | null }) => {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [joue, setJoue] = useState(false);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border px-3 py-2">
      <button
        type="button"
        onClick={() => {
          const el = audio.current;
          if (!el) return;
          if (joue) { el.pause(); return; }
          document.querySelectorAll("audio").forEach((a) => a !== el && a.pause());
          el.play();
        }}
        aria-label={joue ? "Pause" : "Lecture"}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
      >
        {joue ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <span className="label-mono">{duree(secondes)}</span>
      <audio
        ref={audio}
        src={url}
        preload="none"
        onPlay={() => setJoue(true)}
        onPause={() => setJoue(false)}
        onEnded={() => setJoue(false)}
        className="hidden"
      />
    </div>
  );
};

/* La vidéo ne se charge qu'au moment où l'on appuie sur lecture : une liste
   de messages ne doit pas télécharger vingt vidéos sur le réseau d'une salle. */
export const LecteurVideo = ({ url, poster }: { url: string; poster: string | null }) => (
  <video
    src={url}
    poster={poster ?? undefined}
    controls
    playsInline
    preload="none"
    className="max-h-[360px] w-full border border-border bg-night object-contain"
  />
);

const LivreDor = ({ eventId, messagesPublics, vocalAutorise, typeEvenement }: Props) => {
  const { lang } = useLanguage();
  const T = TEXTES[lang === "en" ? "en" : "fr"];

  const [messages, setMessages] = useState<Message[]>([]);
  const [total, setTotal] = useState(0);

  const [mode, setMode] = useState<"ecrit" | "vocal" | "video">("ecrit");
  const [prenom, setPrenom] = useState("");
  const [texte, setTexte] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [apercu, setApercu] = useState<string | null>(null);

  const [session, setSession] = useState<SessionEnregistrement | null>(null);
  const [secondes, setSecondes] = useState(0);
  const [vocal, setVocal] = useState<{ blob: Blob; mime: string; secondes: number } | null>(null);
  const [vocalUrl, setVocalUrl] = useState<string | null>(null);

  const [video, setVideo] = useState<{ fichier: File; poster: Blob | null; secondes: number } | null>(null);
  const [videoApercu, setVideoApercu] = useState<string | null>(null);
  const [progression, setProgression] = useState<number | null>(null);

  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const photoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  const charger = useCallback(async (offset = 0) => {
    if (!messagesPublics) return;
    const [liste, compte] = await Promise.all([
      supabase.rpc("guest_list_livre_dor", { p_event_id: eventId, p_limit: PAGE, p_offset: offset }),
      offset === 0
        ? supabase.rpc("guest_count_livre_dor", { p_event_id: eventId })
        : Promise.resolve({ data: null }),
    ]);
    const rows = ((liste.data ?? []) as Message[]);
    setMessages((prev) => (offset === 0 ? rows : [...prev, ...rows]));
    if (offset === 0) setTotal((compte.data as number | null) ?? rows.length);
  }, [eventId, messagesPublics]);

  useEffect(() => { charger(0); }, [charger]);

  // Le chronomètre de l'enregistrement.
  useEffect(() => {
    if (!session) return;
    const t = window.setInterval(() => setSecondes((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [session]);

  // Les aperçus locaux se révoquent, sinon la mémoire du téléphone se remplit.
  useEffect(() => () => { if (apercu) URL.revokeObjectURL(apercu); }, [apercu]);
  useEffect(() => () => { if (vocalUrl) URL.revokeObjectURL(vocalUrl); }, [vocalUrl]);
  useEffect(() => () => { if (videoApercu) URL.revokeObjectURL(videoApercu); }, [videoApercu]);

  /* La durée et l'aperçu sont lus sur le téléphone, avant tout envoi : une
     vidéo trop longue est refusée tout de suite, pas après deux minutes
     d'envoi sur le wifi d'une salle des fêtes. */
  const choisirVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!f) return;
    setErreur(null);
    if (f.size > VIDEO_MAX_OCTETS) { setErreur(T.videoTropLourde); return; }
    const { thumb, duration } = await generateVideoPoster(f);
    if (duration !== null && duration > VIDEO_MAX_SECONDES + 1) { setErreur(T.videoTropLongue); return; }
    if (videoApercu) URL.revokeObjectURL(videoApercu);
    setVideo({ fichier: f, poster: thumb, secondes: Math.round(duration ?? 0) });
    setVideoApercu(thumb ? URL.createObjectURL(thumb) : null);
  };

  const refilmer = () => {
    if (videoApercu) URL.revokeObjectURL(videoApercu);
    setVideo(null);
    setVideoApercu(null);
  };

  const choisirPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!f) return;
    if (apercu) URL.revokeObjectURL(apercu);
    setPhoto(f);
    setApercu(URL.createObjectURL(f));
  };

  const retirerPhoto = () => {
    if (apercu) URL.revokeObjectURL(apercu);
    setPhoto(null);
    setApercu(null);
  };

  const commencer = async () => {
    setErreur(null);
    try {
      setSecondes(0);
      setSession(await demarrerEnregistrement());
    } catch {
      setErreur(T.micRefuse);
    }
  };

  const terminer = async () => {
    if (!session) return;
    const resultat = await session.arreter();
    setSession(null);
    setVocal(resultat);
    if (vocalUrl) URL.revokeObjectURL(vocalUrl);
    setVocalUrl(URL.createObjectURL(resultat.blob));
  };

  const refaire = () => {
    if (vocalUrl) URL.revokeObjectURL(vocalUrl);
    setVocal(null);
    setVocalUrl(null);
    setSecondes(0);
  };

  const pret =
    prenom.trim().length >= 1 &&
    (mode === "ecrit" ? texte.trim().length >= 2 : mode === "vocal" ? vocal !== null : video !== null) &&
    !envoi;

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pret) return;
    setEnvoi(true);
    setErreur(null);
    try {
      let audioUrl: string | null = null;
      let photoUrl: string | null = null;
      let photoThumb: string | null = null;
      let videoUrl: string | null = null;
      let videoPoster: string | null = null;

      if (mode === "video" && video) {
        const uuid = crypto.randomUUID();
        const type = typeDeclare(video.fichier, "video/mp4");
        setProgression(0);
        videoUrl = await envoyerSurR2({
          eventId,
          chemin: `${eventId}/${uuid}.${extensionDe(type)}`,
          fichier: video.fichier,
          contentType: type,
          onProgress: (r) => setProgression(r),
        });
        if (video.poster) {
          try {
            videoPoster = await envoyerSurR2({
              eventId,
              chemin: `${eventId}/${uuid}-thumb.jpg`,
              fichier: video.poster,
              contentType: "image/jpeg",
            });
          } catch {
            /* Sans aperçu, la vidéo se lit quand même. */
          }
        }
      }

      if (mode === "vocal" && vocal) {
        const uuid = crypto.randomUUID();
        audioUrl = await envoyerSurR2({
          eventId,
          chemin: `${eventId}/${uuid}.${extensionDe(vocal.mime)}`,
          fichier: vocal.blob,
          contentType: vocal.mime,
        });
      }

      if (photo) {
        const { full, thumb, fallback } = await compressImage(photo);
        const uuid = crypto.randomUUID();
        const contentType = fallback ? photo.type || "image/jpeg" : "image/jpeg";
        photoUrl = await envoyerSurR2({
          eventId,
          chemin: `${eventId}/${uuid}.${extensionDe(contentType)}`,
          fichier: full,
          contentType,
        });
        if (thumb) {
          try {
            photoThumb = await envoyerSurR2({
              eventId,
              chemin: `${eventId}/${uuid}-thumb.jpg`,
              fichier: thumb,
              contentType: "image/jpeg",
            });
          } catch {
            /* Sans vignette, on affichera l'image entière. */
          }
        }
      }

      const { error } = await supabase.from("livre_dor").insert({
        event_id: eventId,
        auteur: prenom.trim(),
        texte: mode === "ecrit" ? texte.trim() : null,
        audio_url: mode === "vocal" ? audioUrl : null,
        audio_secondes: mode === "vocal" ? vocal?.secondes ?? null : null,
        video_url: videoUrl,
        video_poster_url: videoPoster,
        video_secondes: videoUrl ? Math.min(video?.secondes ?? 0, VIDEO_MAX_SECONDES) : null,
        photo_url: photoUrl,
        photo_thumb_url: photoThumb,
      });
      if (error) throw error;

      setEnvoye(true);
      setTexte("");
      retirerPhoto();
      refaire();
      refilmer();
      await charger(0);
    } catch {
      setErreur(T.erreur);
    } finally {
      setEnvoi(false);
      setProgression(null);
    }
  };

  const intro = typeEvenement === "mariage" ? T.intro : T.introAutre;

  return (
    <section className="mt-16 border-t border-border pt-12">
      <h2 className="text-[clamp(24px,3.4vw,36px)]">{T.titre}</h2>
      <p className="lead mt-3 max-w-[46ch]">{intro}</p>
      {!messagesPublics && <p className="label-mono mt-2">{T.prive}</p>}

      {envoye ? (
        <div className="mt-8 rounded-xl border border-border p-6">
          <p className="text-lg">{T.merci}</p>
          <button
            type="button"
            onClick={() => setEnvoye(false)}
            className="label-mono mt-4 min-h-[44px] border-b border-foreground pb-0.5 hover:opacity-60"
          >
            {T.autre}
          </button>
        </div>
      ) : (
        <form onSubmit={envoyer} className="mt-8 flex flex-col gap-5 rounded-xl border border-border p-5 sm:p-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="ld-prenom" className="label-mono">{T.prenom}</label>
            <input
              id="ld-prenom"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              maxLength={60}
              required
              className="min-h-[48px] rounded-xl border border-border bg-background px-3 text-base outline-none focus:border-primary"
            />
          </div>

          {(
            <div
              role="group"
              aria-label={T.message}
              className={`grid gap-2 ${vocalAutorise && enregistrementDisponible() ? "grid-cols-3" : "grid-cols-2"}`}
            >
              {(vocalAutorise && enregistrementDisponible()
                ? (["ecrit", "vocal", "video"] as const)
                : (["ecrit", "video"] as const)
              ).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  aria-pressed={mode === m}
                  className="tuile"
                >
                  {m === "ecrit" ? <PenLine aria-hidden="true" /> : m === "vocal" ? <Mic aria-hidden="true" /> : <Video aria-hidden="true" />}
                  {m === "ecrit" ? T.ecrire : m === "vocal" ? T.parler : T.filmer}
                </button>
              ))}
            </div>
          )}

          {mode === "ecrit" ? (
            <div className="flex flex-col gap-2">
              <label htmlFor="ld-texte" className="label-mono">{T.message}</label>
              <textarea
                id="ld-texte"
                value={texte}
                onChange={(e) => setTexte(e.target.value)}
                placeholder={T.messagePlaceholder}
                rows={5}
                maxLength={2000}
                className="rounded-xl border border-border bg-background p-3 text-base outline-none focus:border-primary"
              />
            </div>
          ) : mode === "video" ? (
            <div className="flex flex-col gap-3">
              <input
                ref={videoInput}
                type="file"
                accept="video/*"
                capture="user"
                onChange={(e) => void choisirVideo(e)}
                className="hidden"
              />
              {video ? (
                <div className="flex flex-wrap items-center gap-3">
                  {videoApercu ? (
                    <img src={videoApercu} alt="" className="h-20 w-20 border border-border object-cover" />
                  ) : (
                    <span className="flex h-20 w-20 items-center justify-center border border-border">
                      <Video className="h-5 w-5" />
                    </span>
                  )}
                  <span className="label-mono">{duree(video.secondes)}</span>
                  <button
                    type="button"
                    onClick={refilmer}
                    disabled={envoi}
                    className="label-mono inline-flex min-h-[44px] items-center gap-2 border border-border px-4 hover:border-primary"
                  >
                    <Trash2 className="h-4 w-4" /> {T.videoRefaire}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => videoInput.current?.click()}
                  className="btn-cuivre min-h-[56px] px-6 text-sm"
                >
                  <Video className="h-4 w-4" />
                  {T.videoDemarrer}
                </button>
              )}
              <p className="text-[13px] text-muted-foreground">{T.videoAide}</p>
              {progression !== null && (
                <p className="label-mono">{T.videoEnvoi} · {Math.round(progression * 100)} %</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {vocal && vocalUrl ? (
                <div className="flex flex-wrap items-center gap-3">
                  <LecteurVocal url={vocalUrl} secondes={vocal.secondes} />
                  <button
                    type="button"
                    onClick={refaire}
                    className="label-mono inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border px-4 hover:border-primary"
                  >
                    <Trash2 className="h-4 w-4" /> {T.micRefait}
                  </button>
                </div>
              ) : session ? (
                <button
                  type="button"
                  onClick={terminer}
                  className="inline-flex min-h-[56px] items-center justify-center gap-3 border border-destructive px-6 text-destructive"
                >
                  <Square className="h-4 w-4 fill-current" />
                  <span className="label-mono">{T.micArreter} · {duree(secondes)}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={commencer}
                  className="btn-cuivre min-h-[56px] px-6 text-sm"
                >
                  <Mic className="h-4 w-4" />
                  {T.micDemarrer}
                </button>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={photoInput}
              type="file"
              accept="image/*"
              onChange={choisirPhoto}
              className="hidden"
            />
            {apercu ? (
              <div className="flex items-center gap-3">
                <img src={apercu} alt="" className="h-16 w-16 rounded-xl border border-border object-cover" />
                <button
                  type="button"
                  onClick={retirerPhoto}
                  className="label-mono inline-flex min-h-[44px] items-center gap-2 hover:text-foreground"
                >
                  <X className="h-4 w-4" /> {T.photoRetirer}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => photoInput.current?.click()}
                className="btn-cuivre min-h-[44px] px-5 text-sm"
              >
                <ImageIcon className="h-4 w-4" /> {T.photo}
              </button>
            )}
          </div>

          {erreur && (
            <p className="border-l-2 border-destructive pl-3 text-sm text-destructive">{erreur}</p>
          )}

          <button
            type="submit"
            disabled={!pret}
            className="btn-action w-full"
          >
            <span>{envoi ? T.envoi : T.envoyer}</span>
            <span className="pastille-fleche" aria-hidden="true">
              {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            </span>
          </button>
        </form>
      )}

      {messagesPublics && (
        <div className="mt-10">
          {messages.length === 0 ? (
            <p className="rounded-xl border border-border px-6 py-12 text-center text-muted-foreground">
              {T.aucun}
            </p>
          ) : (
            <>
              <ul className="grid gap-px bg-border sm:grid-cols-2">
                {messages.map((m) => (
                  <li key={m.id} className="flex flex-col gap-3 bg-background p-5">
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="text-lg">{m.auteur}</p>
                      <p className="label-mono shrink-0">
                        {T.parLe}{" "}
                        {new Date(m.created_at).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", {
                          day: "numeric", month: "short",
                        })}
                      </p>
                    </div>
                    {m.texte && <p className="whitespace-pre-line text-[15px] leading-relaxed">{m.texte}</p>}
                    {m.audio_url && <LecteurVocal url={m.audio_url} secondes={m.audio_secondes} />}
                    {m.video_url && <LecteurVideo url={m.video_url} poster={m.video_poster_url ?? null} />}
                    {m.photo_url && (
                      <img
                        src={m.photo_thumb_url ?? m.photo_url}
                        alt=""
                        loading="lazy"
                        className="max-h-[280px] w-full rounded-xl border border-border object-cover"
                      />
                    )}
                  </li>
                ))}
              </ul>
              {messages.length < total && (
                <button
                  type="button"
                  onClick={() => charger(messages.length)}
                  className="label-mono mt-6 min-h-[44px] border-b border-foreground pb-0.5 hover:opacity-60"
                >
                  {T.voirPlus}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
};

export default LivreDor;
