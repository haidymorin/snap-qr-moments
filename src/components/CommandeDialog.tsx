import { useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { startCheckout, renoncementRequis, joursAvant, type PlanId } from "@/lib/checkout";
import { Loader2 } from "lucide-react";

/* Le formulaire qui précède le paiement.
 *
 * Trois champs seulement, et c'est délibéré : ce qui est demandé ici est ce
 * dont l'événement a besoin pour exister à la seconde où l'argent est encaissé.
 * Tout le reste — la couleur de la signalétique, le texte d'accueil — se règle
 * plus tard, depuis le tableau de bord, quand la personne n'a plus sa carte
 * bancaire à la main.
 *
 * La date, elle, ne peut pas attendre : c'est elle qui décide si le
 * renoncement au délai de rétractation doit être recueilli. Le demander après
 * le paiement n'aurait aucune valeur. */

const TEXTES = {
  fr: {
    titre: "Votre événement",
    intro: "Trois informations, et vous passez au paiement. Tout le reste se règle après.",
    nom: "Nom de l'événement",
    nomAide: "Il apparaîtra sur la page que verront vos invités.",
    nomExemple: "Mariage de Camille et Sacha",
    date: "Date de l'événement",
    type: "Type d'événement",
    typeChoisir: "Choisir",
    types: {
      mariage: "Mariage",
      anniversaire: "Anniversaire",
      bapteme: "Baptême",
      entreprise: "Événement d'entreprise",
      autre: "Autre",
    },
    renoncementTitre: (j: number) =>
      j <= 0
        ? "Votre événement a lieu aujourd'hui."
        : `Votre événement a lieu dans ${j} jour${j > 1 ? "s" : ""}.`,
    renoncement:
      "Je demande que le service commence immédiatement et je reconnais perdre mon droit de rétractation de quatorze jours une fois ma galerie ouverte.",
    renoncementPourquoi:
      "Sans cette autorisation, la loi nous oblige à attendre quatorze jours avant d'ouvrir votre galerie — soit après votre fête.",
    payer: "Payer et créer mon événement",
    envoi: "Redirection vers le paiement…",
    securite: "Paiement par carte, traité par Stripe. Nous ne voyons jamais votre numéro.",
  },
  en: {
    titre: "Your event",
    intro: "Three details, then payment. Everything else can wait.",
    nom: "Event name",
    nomAide: "It will appear on the page your guests see.",
    nomExemple: "Camille and Sacha's wedding",
    date: "Event date",
    type: "Event type",
    typeChoisir: "Choose",
    types: {
      mariage: "Wedding",
      anniversaire: "Birthday",
      bapteme: "Christening",
      entreprise: "Company event",
      autre: "Other",
    },
    renoncementTitre: (j: number) =>
      j <= 0 ? "Your event is today." : `Your event is in ${j} day${j > 1 ? "s" : ""}.`,
    renoncement:
      "I ask for the service to start immediately and accept that I lose my fourteen-day right to withdraw once my gallery is open.",
    renoncementPourquoi:
      "Without this, the law requires us to wait fourteen days before opening your gallery — that is, after your party.",
    payer: "Pay and create my event",
    envoi: "Taking you to payment…",
    securite: "Card payment handled by Stripe. We never see your card number.",
  },
} as const;

const TYPES = ["mariage", "anniversaire", "bapteme", "entreprise", "autre"] as const;

interface Props {
  plan: PlanId | null;
  onClose: () => void;
}

const CommandeDialog = ({ plan, onClose }: Props) => {
  const { lang } = useLanguage();
  const T = TEXTES[lang === "en" ? "en" : "fr"];

  const [nom, setNom] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState("mariage");
  const [renonce, setRenonce] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const demandeRenoncement = useMemo(() => renoncementRequis(date), [date]);
  const jours = useMemo(() => joursAvant(date) ?? 0, [date]);
  const aujourdhui = new Date().toISOString().slice(0, 10);

  const pret =
    nom.trim().length >= 2 &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    (joursAvant(date) ?? -1) >= 0 &&
    (!demandeRenoncement || renonce);

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan || !pret || envoi) return;
    setEnvoi(true);
    setErreur(null);
    try {
      await startCheckout({ plan, nom: nom.trim(), date, type, executionAnticipee: renonce });
    } catch (err) {
      setErreur((err as Error).message);
      setEnvoi(false);
    }
  };

  return (
    <Dialog open={plan !== null} onOpenChange={(ouvert) => !ouvert && !envoi && onClose()}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-[26px] leading-tight">{T.titre}</DialogTitle>
        </DialogHeader>

        <p className="-mt-1 text-sm text-muted-foreground">{T.intro}</p>

        <form onSubmit={envoyer} className="mt-4 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="cmd-nom">{T.nom}</Label>
            <Input
              id="cmd-nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder={T.nomExemple}
              maxLength={80}
              required
            />
            <p className="text-xs text-muted-foreground">{T.nomAide}</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cmd-date">{T.date}</Label>
              <Input
                id="cmd-date"
                type="date"
                value={date}
                min={aujourdhui}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cmd-type">{T.type}</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="cmd-type">
                  <SelectValue placeholder={T.typeChoisir} />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((k) => (
                    <SelectItem key={k} value={k}>{T.types[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {demandeRenoncement && (
            <div className="border border-border p-4">
              <p className="label-mono mb-2">{T.renoncementTitre(jours)}</p>
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={renonce}
                  onChange={(e) => setRenonce(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 accent-primary"
                />
                <span>{T.renoncement}</span>
              </label>
              <p className="mt-3 text-xs text-muted-foreground">{T.renoncementPourquoi}</p>
            </div>
          )}

          {erreur && (
            <p className="border-l-2 border-destructive pl-3 text-sm text-destructive">{erreur}</p>
          )}

          <button
            type="submit"
            disabled={!pret || envoi}
            className="inline-flex min-h-[52px] items-center justify-center gap-2 border border-primary bg-primary px-8 text-xs font-semibold uppercase tracking-[0.1em] text-primary-foreground transition-colors hover:bg-transparent hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            {envoi && <Loader2 className="h-4 w-4 animate-spin" />}
            {envoi ? T.envoi : T.payer}
          </button>

          <p className="text-xs text-muted-foreground">{T.securite}</p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CommandeDialog;
