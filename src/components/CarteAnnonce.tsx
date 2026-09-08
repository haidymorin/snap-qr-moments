import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Megaphone } from "lucide-react";
import { useLanguage, Lang } from "@/contexts/LanguageContext";

/* Le message à toute la salle, côté mariés.
 *
 * Ce n'est pas une notification qui sonne dans la poche des gens : c'est un
 * bandeau qui apparaît en haut de la page où ils déposent leurs photos, et
 * qu'ils ferment d'un doigt. La raison est dans la migration — sur iPhone, une
 * vraie notification push suppose d'avoir installé le site sur l'écran
 * d'accueil, ce qu'aucun invité de mariage ne fera.
 *
 * Cent quatre-vingts caractères, et c'est volontaire. Un message plus long
 * n'est pas lu à minuit sur un téléphone à dix pour cent de batterie.
 */

const MAX = 180;

const T: Record<Lang, Record<string, string>> = {
  fr: {
    titre: "Un mot à toute la salle",
    chapo:
      "Le message s'affiche en haut de la page de vos invités, sur les téléphones où elle est ouverte. Comptez jusqu'à vingt secondes avant qu'il apparaisse.",
    exemple: "Photo de groupe dans le jardin dans dix minutes !",
    afficher: "Afficher le message",
    retirer: "Retirer le message",
    enCours: "Affiché en ce moment",
    enregistre: "Message affiché.",
    retire: "Message retiré.",
    erreur: "L'enregistrement a échoué.",
    restants: "caractères restants",
  },
  en: {
    titre: "A word to the whole room",
    chapo:
      "The message appears at the top of your guests' page, on the phones where it is open. Allow up to twenty seconds.",
    exemple: "Group photo in the garden in ten minutes!",
    afficher: "Show the message",
    retirer: "Remove the message",
    enCours: "Showing right now",
    enregistre: "Message showing.",
    retire: "Message removed.",
    erreur: "Saving failed.",
    restants: "characters left",
  },
};

interface Props {
  eventId: string;
  texte: string | null;
  onChange: (v: { annonce_texte: string | null; annonce_depuis: string | null }) => void;
}

const CarteAnnonce = ({ eventId, texte, onChange }: Props) => {
  const { lang } = useLanguage();
  const t = T[lang === "en" ? "en" : "fr"];
  const [valeur, setValeur] = useState(texte ?? "");
  const [envoi, setEnvoi] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const enregistrer = async (contenu: string | null) => {
    setEnvoi(true);
    setNote(null);
    const depuis = contenu ? new Date().toISOString() : null;
    const { error } = await supabase
      .from("events")
      .update({ annonce_texte: contenu, annonce_depuis: depuis })
      .eq("id", eventId);
    setEnvoi(false);
    if (error) {
      setNote(t.erreur);
      return;
    }
    onChange({ annonce_texte: contenu, annonce_depuis: depuis });
    setNote(contenu ? t.enregistre : t.retire);
  };

  return (
    <section className="mt-10 rounded-2xl border border-border bg-card p-6">
      <h3 className="flex items-center gap-2 text-xl">
        <Megaphone className="h-5 w-5 text-primary" /> {t.titre}
      </h3>
      <p className="mt-2 max-w-[62ch] text-sm text-muted-foreground">{t.chapo}</p>

      {texte && (
        <p className="label-mono mt-4 text-primary">{t.enCours}</p>
      )}

      <textarea
        value={valeur}
        maxLength={MAX}
        rows={2}
        placeholder={t.exemple}
        onChange={(e) => setValeur(e.target.value)}
        className="mt-4 w-full rounded-xl border border-border bg-background p-3 text-[15px]"
      />
      <p className="mt-1 text-xs text-muted-foreground">
        {MAX - valeur.length} {t.restants}
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          variant="hero"
          disabled={envoi || valeur.trim().length === 0}
          onClick={() => void enregistrer(valeur.trim())}
        >
          {envoi && <Loader2 className="h-4 w-4 animate-spin" />} {t.afficher}
        </Button>
        {texte && (
          <Button
            variant="outline"
            disabled={envoi}
            onClick={() => {
              setValeur("");
              void enregistrer(null);
            }}
          >
            {t.retirer}
          </Button>
        )}
      </div>

      {note && <p className="mt-3 text-sm text-muted-foreground">{note}</p>}
    </section>
  );
};

export default CarteAnnonce;
