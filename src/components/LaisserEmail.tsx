import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check, Loader2, X } from "lucide-react";
import { useLanguage, Lang } from "@/contexts/LanguageContext";

/* L'adresse que l'invité laisse, s'il le veut, après avoir déposé ses photos.
 *
 * C'est le seul moment où la proposition a du sens : il vient de participer,
 * il veut voir le reste. Demander avant le dépôt ferait perdre la moitié des
 * gens, et c'est exactement ce qu'on reproche aux autres solutions.
 *
 * Ce que ça permet côté mariés : le mot de remerciement du lendemain soir,
 * quand les invités trient enfin leurs photos de la veille. Sans adresse,
 * aucun moyen de les y ramener — on ne connaît ni leur nom ni leur numéro.
 *
 * Ce que ça ne permet pas, et c'est écrit à l'écran : entrer dans une liste
 * de diffusion. L'adresse sert au lien de la galerie et au mot des mariés,
 * elle n'entre pas dans le fichier clients, et elle disparaît avec la
 * galerie. Le consentement, c'est le geste lui-même.
 */

const T: Record<Lang, Record<string, string>> = {
  fr: {
    titreModale: "Profitez de la soirée. On vous rappellera vos photos.",
    chapoModale:
      "Laissez votre adresse : vous recevrez le lien de la galerie, et un rappel le lendemain soir pour déposer vos photos.",
    plusTard: "Plus tard",
    titre: "Vous voulez voir les photos des autres ?",
    chapo:
      "Laissez votre adresse : vous recevrez le lien de la galerie, et le mot des mariés.",
    champ: "votre@adresse.fr",
    envoyer: "Recevoir le lien",
    merci: "C'est noté. Vous recevrez le lien.",
    invalide: "Cette adresse ne semble pas valide.",
    erreur: "L'enregistrement n'a pas abouti.",
    usage:
      "Cette adresse sert au lien de la galerie et au mot des mariés. Rien d'autre, et elle disparaît avec la galerie.",
  },
  en: {
    titreModale: "Enjoy the party. We will remind you about your photos.",
    chapoModale:
      "Leave your address: you will get the gallery link, and a reminder the next evening to upload your photos.",
    plusTard: "Later",
    titre: "Want to see everyone else's photos?",
    chapo: "Leave your address: you will get the gallery link, and the couple's note.",
    champ: "your@address.com",
    envoyer: "Get the link",
    merci: "Noted. You will receive the link.",
    invalide: "That address does not look valid.",
    erreur: "It could not be saved.",
    usage:
      "This address is used for the gallery link and the couple's note. Nothing else, and it disappears with the gallery.",
  },
};

/* Deux places pour la même demande.
 *
 * « bloc » : après un dépôt réussi, au moment où l'invité veut voir la suite.
 * « modale » : à l'arrivée sur la page, parce que la plupart des invités ne
 * déposent rien pendant la fête — ils photographient, et ils oublient. Une
 * adresse laissée en arrivant est ce qui permet de les ramener le lendemain.
 * La croix ferme tout, et la galerie reste accessible : rien n'est bloqué
 * derrière l'adresse. */
const LaisserEmail = ({
  eventId,
  variante = "bloc",
  onFermer,
}: {
  eventId: string;
  variante?: "bloc" | "modale";
  onFermer?: () => void;
}) => {
  const { lang } = useLanguage();
  const t = T[lang === "en" ? "en" : "fr"];

  const [email, setEmail] = useState("");
  const [etat, setEtat] = useState<"saisie" | "envoi" | "fait">("saisie");
  const [erreur, setErreur] = useState<string | null>(null);

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    const propre = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(propre)) {
      setErreur(t.invalide);
      return;
    }
    setErreur(null);
    setEtat("envoi");
    const { error } = await supabase.rpc("guest_laisser_email" as never, {
      p_event_id: eventId,
      p_email: propre,
    } as never);
    if (error) {
      setErreur(t.erreur);
      setEtat("saisie");
      return;
    }
    setEtat("fait");
  };

  const modale = variante === "modale";

  if (etat === "fait") {
    const merci = (
      <p className="mt-5 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-[14px] text-muted-foreground">
        <Check className="h-4 w-4 text-primary" /> {t.merci}
      </p>
    );
    if (!modale) return merci;
    return (
      <Voile onFermer={onFermer}>
        {merci}
        <button
          type="button"
          onClick={onFermer}
          className="mt-4 inline-flex min-h-[44px] items-center rounded-xl border border-primary bg-primary px-5 text-[13.5px] font-semibold text-primary-foreground"
        >
          {t.envoyer === "Recevoir le lien" ? "Voir la galerie" : "See the gallery"}
        </button>
      </Voile>
    );
  }

  const formulaire = (
    <form onSubmit={envoyer} className={modale ? "" : "mt-5 rounded-xl border border-border bg-card p-4"}>
      <p className={modale ? "text-[19px] font-semibold leading-snug text-foreground" : "text-[15px] font-semibold text-foreground"}>
        {modale ? t.titreModale : t.titre}
      </p>
      <p className="mt-1 max-w-[52ch] text-[13.5px] leading-relaxed text-muted-foreground">
        {modale ? t.chapoModale : t.chapo}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.champ}
          autoComplete="email"
          className="min-h-[44px] min-w-[220px] flex-1 rounded-xl border border-border bg-background px-3 text-[15px] outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={etat === "envoi"}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-primary bg-primary px-4 text-[13.5px] font-semibold text-primary-foreground transition-colors hover:bg-transparent hover:text-primary disabled:opacity-60"
        >
          {etat === "envoi" && <Loader2 className="h-4 w-4 animate-spin" />}
          {t.envoyer}
        </button>
      </div>
      {erreur && <p className="mt-2 text-[13px] text-destructive">{erreur}</p>}
      <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">{t.usage}</p>
      {modale && (
        <button
          type="button"
          onClick={onFermer}
          className="mt-3 text-[13px] text-muted-foreground underline underline-offset-4"
        >
          {t.plusTard}
        </button>
      )}
    </form>
  );

  return modale ? <Voile onFermer={onFermer}>{formulaire}</Voile> : formulaire;
};

/* Le voile de la modale. Sur un téléphone tenu d'une main, la carte se pose en
   bas de l'écran : c'est là que le pouce arrive. */
const Voile = ({ children, onFermer }: { children: React.ReactNode; onFermer?: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-end justify-center bg-night/70 p-0 sm:items-center sm:p-6">
    <div className="relative w-full max-w-[520px] border border-border bg-background p-5 pb-7 sm:p-6">
      <button
        type="button"
        onClick={onFermer}
        aria-label="Fermer"
        className="absolute right-3 top-3 grid h-9 w-9 place-items-center border border-border text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      {children}
    </div>
  </div>
);

export default LaisserEmail;
