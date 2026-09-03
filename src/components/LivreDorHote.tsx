import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, Pause, Play } from "lucide-react";

/* Le livre d'or, côté hôtes.
 *
 * Ils voient tout, y compris ce qu'ils ont masqué — parce qu'un message masqué
 * n'est pas supprimé. C'est délibéré : retirer de la galerie ce qui gêne ne
 * devrait pas effacer le souvenir de celui qui l'a écrit, et un couple change
 * parfois d'avis le lendemain.
 */

const TEXTES = {
  fr: {
    titre: "Le livre d'or",
    vide: "Aucun message pour l'instant. Ils arrivent surtout après la fête.",
    masquer: "Masquer",
    afficher: "Réafficher",
    masque: "Masqué",
    compte: (n: number) => `${n} message${n > 1 ? "s" : ""}`,
    erreur: "Modification impossible",
  },
  en: {
    titre: "The guest book",
    vide: "No messages yet. They mostly arrive after the party.",
    masquer: "Hide",
    afficher: "Show again",
    masque: "Hidden",
    compte: (n: number) => `${n} message${n > 1 ? "s" : ""}`,
    erreur: "Could not update",
  },
};

interface MessageHote {
  id: string;
  auteur: string;
  texte: string | null;
  audio_url: string | null;
  audio_secondes: number | null;
  photo_url: string | null;
  photo_thumb_url: string | null;
  masque: boolean;
  created_at: string;
}

const duree = (s: number | null) => {
  const n = Math.max(0, s ?? 0);
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
};

const Lecteur = ({ url, secondes }: { url: string; secondes: number | null }) => {
  const [joue, setJoue] = useState(false);
  const [el, setEl] = useState<HTMLAudioElement | null>(null);
  return (
    <div className="flex items-center gap-3 border border-border px-3 py-2">
      <button
        type="button"
        onClick={() => {
          if (!el) return;
          if (joue) { el.pause(); return; }
          document.querySelectorAll("audio").forEach((a) => a !== el && a.pause());
          el.play();
        }}
        aria-label={joue ? "Pause" : "Lecture"}
        className="flex h-9 w-9 shrink-0 items-center justify-center border border-primary transition-colors hover:bg-primary hover:text-primary-foreground"
      >
        {joue ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <span className="label-mono">{duree(secondes)}</span>
      <audio
        ref={setEl}
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

const LivreDorHote = ({ eventId, lang }: { eventId: string; lang: string }) => {
  const T = TEXTES[lang === "en" ? "en" : "fr"];
  const { toast } = useToast();
  const [messages, setMessages] = useState<MessageHote[]>([]);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const { data } = await supabase
      .from("livre_dor")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });
    setMessages((data ?? []) as MessageHote[]);
    setChargement(false);
  }, [eventId]);

  useEffect(() => { charger(); }, [charger]);

  const basculer = async (m: MessageHote) => {
    setEnCours(m.id);
    const { error } = await supabase
      .from("livre_dor").update({ masque: !m.masque }).eq("id", m.id);
    if (error) {
      toast({ title: T.erreur, description: error.message, variant: "destructive" });
    } else {
      setMessages((prev) =>
        prev.map((x) => (x.id === m.id ? { ...x, masque: !x.masque } : x)),
      );
    }
    setEnCours(null);
  };

  if (chargement) {
    return (
      <section className="mt-14 border-t border-border pt-10">
        <h2 className="text-2xl">{T.titre}</h2>
        <Loader2 className="mt-6 h-5 w-5 animate-spin text-muted-foreground" />
      </section>
    );
  }

  return (
    <section className="mt-14 border-t border-border pt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-2xl">{T.titre}</h2>
        <p className="label-mono">{T.compte(messages.length)}</p>
      </div>

      {messages.length === 0 ? (
        <p className="mt-6 border border-border px-6 py-12 text-center text-muted-foreground">
          {T.vide}
        </p>
      ) : (
        <ul className="mt-6 grid gap-px bg-border sm:grid-cols-2">
          {messages.map((m) => (
            <li
              key={m.id}
              className={`flex flex-col gap-3 bg-background p-5 ${m.masque ? "opacity-50" : ""}`}
            >
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-lg">{m.auteur}</p>
                <p className="label-mono shrink-0">
                  {new Date(m.created_at).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", {
                    day: "numeric", month: "short",
                  })}
                </p>
              </div>
              {m.masque && <p className="label-mono text-destructive">{T.masque}</p>}
              {m.texte && (
                <p className="whitespace-pre-line text-[15px] leading-relaxed">{m.texte}</p>
              )}
              {m.audio_url && <Lecteur url={m.audio_url} secondes={m.audio_secondes} />}
              {m.photo_url && (
                <img
                  src={m.photo_thumb_url ?? m.photo_url}
                  alt=""
                  loading="lazy"
                  className="max-h-[240px] w-full border border-border object-cover"
                />
              )}
              <button
                type="button"
                onClick={() => basculer(m)}
                disabled={enCours === m.id}
                className="label-mono mt-1 inline-flex min-h-[40px] w-fit items-center gap-2 border border-border px-3 transition-colors hover:border-primary disabled:opacity-50"
              >
                {enCours === m.id
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : m.masque ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {m.masque ? T.afficher : T.masquer}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default LivreDorHote;
