import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, Copy, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { useLanguage, Lang } from "@/contexts/LanguageContext";

/* Le diaporama, côté mariés.
 *
 * Trois choses, et pas une de plus : le lien à ouvrir sur l'ordinateur de la
 * salle, ce qu'on projette, et le délai avant qu'une photo apparaisse.
 *
 * Le lien contient un jeton plutôt qu'un mot de passe. La raison est
 * pratique : personne ne tape un mot de passe sur le clavier d'un vidéo­
 * projecteur devant deux cents personnes. Il se régénère d'un bouton — si le
 * lien traîne sur un groupe WhatsApp, l'ancien meurt aussitôt.
 */

const T: Record<Lang, Record<string, string>> = {
  fr: {
    titre: "Le diaporama de la salle",
    chapo: "Ouvrez ce lien sur l'ordinateur relié à l'écran ou au vidéoprojecteur, puis passez en plein écran. Les photos arrivent toutes seules.",
    copier: "Copier le lien",
    copie: "Copié",
    ouvrir: "Ouvrir",
    regenerer: "Générer un nouveau lien",
    regenererAide: "L'ancien lien cessera de fonctionner immédiatement.",
    mode: "Ce qu'on projette",
    photos: "Les photos",
    livreDor: "Les messages du livre d'or",
    alterne: "Les deux, en alternance",
    delai: "Délai avant affichage",
    delaiAide: "Le temps qui sépare le dépôt d'une photo de son passage à l'écran. Laissez zéro sauf si vous voulez pouvoir retirer une photo avant qu'elle soit vue.",
    immediat: "Immédiat",
    minutes: "minutes",
    vocalNote: "Les messages vocaux ne sont pas diffusés : on ne met pas de son dans une salle où quelqu'un parle au micro. Ils restent dans votre galerie.",
    enregistre: "Réglages enregistrés.",
  },
  en: {
    titre: "The room slideshow",
    chapo: "Open this link on the computer wired to the screen or projector, then go full screen. Photos appear on their own.",
    copier: "Copy the link",
    copie: "Copied",
    ouvrir: "Open",
    regenerer: "Generate a new link",
    regenererAide: "The old link stops working immediately.",
    mode: "What is shown",
    photos: "The photos",
    livreDor: "The guest book messages",
    alterne: "Both, alternating",
    delai: "Delay before showing",
    delaiAide: "The time between a photo being uploaded and appearing on screen. Leave it at zero unless you want to be able to remove a photo before it is seen.",
    immediat: "Immediate",
    minutes: "minutes",
    vocalNote: "Voice messages are not played: no sound goes into a room where someone is on the microphone. They stay in your gallery.",
    enregistre: "Settings saved.",
  },
};

interface Props {
  eventId: string;
  jeton: string;
  mode: string;
  delai: number;
}

const CarteDiaporama = ({ eventId, jeton: jetonInitial, mode: modeInitial, delai: delaiInitial }: Props) => {
  const { lang } = useLanguage();
  const t = T[lang];

  const [jeton, setJeton] = useState(jetonInitial);
  const [mode, setMode] = useState(modeInitial);
  const [delai, setDelai] = useState(delaiInitial);
  const [copie, setCopie] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [fait, setFait] = useState(false);

  const lien = `${window.location.origin}/diaporama/${eventId}?jeton=${jeton}`;

  const enregistrer = async (nouveauMode: string, nouveauDelai: number) => {
    setMode(nouveauMode);
    setDelai(nouveauDelai);
    setOccupe(true);
    setFait(false);
    await supabase.rpc("regler_diaporama", {
      p_event: eventId, p_mode: nouveauMode, p_delai: nouveauDelai,
    });
    setOccupe(false);
    setFait(true);
    window.setTimeout(() => setFait(false), 2500);
  };

  const regenerer = async () => {
    setOccupe(true);
    const { data } = await supabase.rpc("regenerer_jeton_diaporama", { p_event: eventId });
    if (data) setJeton(data as string);
    setOccupe(false);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <h3 className="text-[18px] font-semibold text-foreground">{t.titre}</h3>
        {occupe && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {fait && <span className="label-mono text-accent">{t.enregistre}</span>}
      </div>
      <p className="mt-2 max-w-[62ch] text-[14px] leading-relaxed text-muted-foreground">{t.chapo}</p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <code className="flex-1 break-all rounded-xl bg-muted px-4 py-2 text-[13px]">{lien}</code>
        <Button
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(lien);
            setCopie(true);
            window.setTimeout(() => setCopie(false), 2000);
          }}
        >
          {copie ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copie ? t.copie : t.copier}
        </Button>
        <Button variant="hero" asChild>
          <a href={lien} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" /> {t.ouvrir}
          </a>
        </Button>
      </div>

      <div className="mt-6 border-t border-border pt-5">
        <p className="text-[13.5px] font-semibold text-foreground">{t.mode}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {([["photos", t.photos], ["livre_dor", t.livreDor], ["alterne", t.alterne]] as const).map(
            ([cle, nom]) => (
              <button
                key={cle}
                type="button"
                onClick={() => enregistrer(cle, delai)}
                className={`min-h-[40px] rounded-full border px-4 text-[13.5px] transition-colors ${
                  mode === cle
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary"
                }`}
              >
                {nom}
              </button>
            ),
          )}
        </div>
        <p className="mt-3 max-w-[62ch] text-[12.5px] leading-relaxed text-muted-foreground">
          {t.vocalNote}
        </p>
      </div>

      <div className="mt-6 border-t border-border pt-5">
        <p className="text-[13.5px] font-semibold text-foreground">{t.delai}</p>
        <p className="mt-1 max-w-[62ch] text-[12.5px] leading-relaxed text-muted-foreground">
          {t.delaiAide}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[0, 1, 2, 5].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => enregistrer(mode, m)}
              className={`min-h-[40px] rounded-full border px-4 text-[13.5px] transition-colors ${
                delai === m
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary"
              }`}
            >
              {m === 0 ? t.immediat : `${m} ${t.minutes}`}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <Button variant="ghost" size="sm" onClick={regenerer} disabled={occupe}>
          <RefreshCw className="h-4 w-4" /> {t.regenerer}
        </Button>
        <span className="text-[12.5px] text-muted-foreground">{t.regenererAide}</span>
      </div>
    </div>
  );
};

export default CarteDiaporama;
