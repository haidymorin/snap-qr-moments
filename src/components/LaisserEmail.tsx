import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check, Loader2 } from "lucide-react";
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

const LaisserEmail = ({ eventId }: { eventId: string }) => {
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

  if (etat === "fait") {
    return (
      <p className="mt-5 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-[14px] text-muted-foreground">
        <Check className="h-4 w-4 text-primary" /> {t.merci}
      </p>
    );
  }

  return (
    <form onSubmit={envoyer} className="mt-5 rounded-xl border border-border bg-card p-4">
      <p className="text-[15px] font-semibold text-foreground">{t.titre}</p>
      <p className="mt-1 max-w-[52ch] text-[13.5px] leading-relaxed text-muted-foreground">
        {t.chapo}
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
    </form>
  );
};

export default LaisserEmail;
