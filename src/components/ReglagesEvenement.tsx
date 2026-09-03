import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

/* Les réglages d'un événement, côté hôtes.
 *
 * La liste est courte, et c'est la règle qu'on s'est donnée : un réglage n'a le
 * droit d'exister que s'il change vraiment quelque chose pour les invités.
 * Chaque case ajoutée est une décision de plus imposée à quelqu'un qui prépare
 * un mariage — et qui a autre chose à faire.
 *
 * Deux absences sont donc volontaires. La modération des photos : une galerie
 * modérée n'affiche rien pendant la fête, et personne ne trie neuf cents
 * photos le lendemain. Le téléchargement par les invités : toujours autorisé,
 * c'est ce qui les fait revenir sur la galerie, donc ce qui vend les albums.
 */

const TEXTES = {
  fr: {
    titre: "Réglages",
    intro: "Ce que voient vos invités. Modifiable à tout moment.",
    accueil: "Message d'accueil",
    accueilAide: "La première phrase que lit un invité qui scanne le QR code. Laissez vide pour n'afficher que le nom de l'événement.",
    accueilExemple: "Prenez-nous en photo, on s'occupe du reste.",
    collecte: "Dernier jour pour déposer",
    collecteAide: "Les photos arrivent surtout le lendemain. Sept jours après l'événement par défaut.",
    livreDor: "Livre d'or",
    livreDorAide: "Vos invités peuvent vous laisser un mot, écrit ou enregistré.",
    vocal: "Autoriser les messages vocaux",
    vocalAide: "Une voix qu'on garde, ce n'est pas la même chose qu'un texte.",
    publics: "Les invités lisent les messages des autres",
    publicsAide: "Visibles par tous, chacun a envie d'écrire à son tour. Réservés à vous, on vous écrit des choses plus intimes.",
    enregistrer: "Enregistrer",
    enregistre: "Réglages enregistrés",
    erreur: "Enregistrement impossible",
  },
  en: {
    titre: "Settings",
    intro: "What your guests see. Change it any time.",
    accueil: "Welcome message",
    accueilAide: "The first line a guest reads after scanning the QR code. Leave empty to show only the event name.",
    accueilExemple: "Take photos of us — we'll handle the rest.",
    collecte: "Last day to upload",
    collecteAide: "Photos mostly arrive the day after. Seven days after the event by default.",
    livreDor: "Guest book",
    livreDorAide: "Your guests can leave you a note, written or recorded.",
    vocal: "Allow voice messages",
    vocalAide: "A voice you keep is not the same thing as a text.",
    publics: "Guests can read each other's messages",
    publicsAide: "Visible to all, each message makes the next one more likely. Kept for you, people write more personal things.",
    enregistrer: "Save",
    enregistre: "Settings saved",
    erreur: "Could not save",
  },
};

export interface Reglages {
  message_accueil: string | null;
  collecte_fin: string | null;
  livre_dor_actif: boolean;
  livre_dor_vocal: boolean;
  livre_dor_public: boolean;
}

interface Props {
  eventId: string;
  eventDate: string;
  valeurs: Reglages;
  /** Le livre d'or n'existe pas dans l'Essentiel : on n'affiche pas ses réglages. */
  livreDorInclus: boolean;
  lang: string;
  onEnregistre: (r: Reglages) => void;
}

const Interrupteur = ({
  id, actif, onChange, titre, aide, desactive,
}: {
  id: string; actif: boolean; onChange: (v: boolean) => void;
  titre: string; aide: string; desactive?: boolean;
}) => (
  <label
    htmlFor={id}
    className={`flex cursor-pointer items-start justify-between gap-6 border-t border-border py-4 ${
      desactive ? "opacity-40" : ""
    }`}
  >
    <span className="min-w-0">
      <span className="block text-[15px]">{titre}</span>
      <span className="mt-1 block max-w-[52ch] text-xs text-muted-foreground">{aide}</span>
    </span>
    <input
      id={id}
      type="checkbox"
      checked={actif}
      disabled={desactive}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-1 h-5 w-5 shrink-0 accent-primary"
    />
  </label>
);

const ReglagesEvenement = ({
  eventId, eventDate, valeurs, livreDorInclus, lang, onEnregistre,
}: Props) => {
  const T = TEXTES[lang === "en" ? "en" : "fr"];
  const { toast } = useToast();
  const [form, setForm] = useState<Reglages>(valeurs);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => setForm(valeurs), [valeurs]);

  const parDefaut = (() => {
    const d = new Date(`${eventDate}T12:00:00Z`);
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  })();

  const modifie = JSON.stringify(form) !== JSON.stringify(valeurs);

  const enregistrer = async () => {
    setEnvoi(true);
    try {
      const { error } = await supabase
        .from("events")
        .update({
          message_accueil: form.message_accueil?.trim() || null,
          collecte_fin: form.collecte_fin || null,
          livre_dor_actif: form.livre_dor_actif,
          livre_dor_vocal: form.livre_dor_vocal,
          livre_dor_public: form.livre_dor_public,
        })
        .eq("id", eventId);
      if (error) throw error;
      onEnregistre(form);
      toast({ title: T.enregistre });
    } catch (err) {
      toast({
        title: T.erreur,
        description: String((err as Error).message ?? err),
        variant: "destructive",
      });
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <section className="mt-14 border-t border-border pt-10">
      <h2 className="text-2xl">{T.titre}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{T.intro}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="rg-accueil" className="label-mono">{T.accueil}</label>
          <textarea
            id="rg-accueil"
            rows={3}
            maxLength={200}
            value={form.message_accueil ?? ""}
            placeholder={T.accueilExemple}
            onChange={(e) => setForm({ ...form, message_accueil: e.target.value })}
            className="border border-border bg-background p-3 text-base outline-none focus:border-primary"
          />
          <p className="text-xs text-muted-foreground">{T.accueilAide}</p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="rg-collecte" className="label-mono">{T.collecte}</label>
          <input
            id="rg-collecte"
            type="date"
            min={eventDate}
            value={form.collecte_fin ?? parDefaut}
            onChange={(e) => setForm({ ...form, collecte_fin: e.target.value })}
            className="min-h-[48px] border border-border bg-background px-3 text-base outline-none focus:border-primary"
          />
          <p className="text-xs text-muted-foreground">{T.collecteAide}</p>
        </div>
      </div>

      {livreDorInclus && (
        <div className="mt-8">
          <Interrupteur
            id="rg-livredor"
            actif={form.livre_dor_actif}
            onChange={(v) => setForm({ ...form, livre_dor_actif: v })}
            titre={T.livreDor}
            aide={T.livreDorAide}
          />
          <Interrupteur
            id="rg-vocal"
            actif={form.livre_dor_vocal}
            onChange={(v) => setForm({ ...form, livre_dor_vocal: v })}
            titre={T.vocal}
            aide={T.vocalAide}
            desactive={!form.livre_dor_actif}
          />
          <Interrupteur
            id="rg-publics"
            actif={form.livre_dor_public}
            onChange={(v) => setForm({ ...form, livre_dor_public: v })}
            titre={T.publics}
            aide={T.publicsAide}
            desactive={!form.livre_dor_actif}
          />
        </div>
      )}

      <button
        type="button"
        onClick={enregistrer}
        disabled={!modifie || envoi}
        className="mt-8 inline-flex min-h-[48px] items-center gap-2 border border-primary bg-primary px-6 text-xs font-semibold uppercase tracking-[0.1em] text-primary-foreground transition-colors hover:bg-transparent hover:text-primary disabled:opacity-40"
      >
        {envoi && <Loader2 className="h-4 w-4 animate-spin" />}
        {T.enregistrer}
      </button>
    </section>
  );
};

export default ReglagesEvenement;
