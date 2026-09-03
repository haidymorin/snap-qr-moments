import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

/* Définir un mot de passe depuis son espace.
 *
 * Jusqu'ici, la seule porte d'entrée était le lien reçu après le paiement.
 * Il ne sert qu'une fois et se périme : passé ce moment, un client qui
 * revenait trois semaines plus tard n'avait plus aucun moyen d'entrer, et
 * écrivait pour qu'on lui rouvre la porte à la main.
 *
 * Le bloc reste replié : c'est un réglage, pas une étape. Personne ne doit
 * avoir l'impression qu'il lui reste quelque chose à faire en arrivant. */

const TEXTES = {
  fr: {
    ouvrir: "Définir un mot de passe",
    fermer: "Annuler",
    aide:
      "Pour revenir dans votre espace sans attendre un lien. Huit caractères au minimum.",
    champ: "Nouveau mot de passe",
    confirmation: "Confirmez",
    valider: "Enregistrer",
    encours: "Enregistrement",
    reussi: "Mot de passe enregistré. Il fonctionne dès maintenant.",
    tropCourt: "Huit caractères au minimum.",
    different: "Les deux saisies ne correspondent pas.",
    echec: "L'enregistrement n'a pas abouti. Réessayez.",
  },
  en: {
    ouvrir: "Set a password",
    fermer: "Cancel",
    aide: "So you can come back without waiting for a link. Eight characters minimum.",
    champ: "New password",
    confirmation: "Confirm",
    valider: "Save",
    encours: "Saving",
    reussi: "Password saved. It works right away.",
    tropCourt: "Eight characters minimum.",
    different: "The two entries do not match.",
    echec: "Could not save. Please try again.",
  },
} as const;

const champ =
  "min-h-[52px] w-full border border-border bg-card px-4 text-[15px] text-foreground outline-none transition-colors focus:border-foreground";

const MotDePasse = () => {
  const { lang } = useLanguage();
  const T = TEXTES[lang === "en" ? "en" : "fr"];

  const [ouvert, setOuvert] = useState(false);
  const [mdp, setMdp] = useState("");
  const [bis, setBis] = useState("");
  const [etat, setEtat] = useState<"saisie" | "envoi" | "fait">("saisie");
  const [erreur, setErreur] = useState<string | null>(null);

  const enregistrer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (etat === "envoi") return;

    if (mdp.length < 8) return setErreur(T.tropCourt);
    if (mdp !== bis) return setErreur(T.different);

    setErreur(null);
    setEtat("envoi");

    const { error } = await supabase.auth.updateUser({ password: mdp });

    if (error) {
      setErreur(error.message || T.echec);
      setEtat("saisie");
      return;
    }

    setMdp("");
    setBis("");
    setEtat("fait");
  };

  if (etat === "fait") {
    return (
      <section className="mt-16 border-t border-border pt-8">
        <p className="text-[15px] text-muted-foreground">{T.reussi}</p>
      </section>
    );
  }

  return (
    <section className="mt-16 border-t border-border pt-8">
      {!ouvert ? (
        <button
          type="button"
          onClick={() => setOuvert(true)}
          className="label-mono border-b border-foreground pb-1 text-foreground"
        >
          {T.ouvrir}
        </button>
      ) : (
        <form onSubmit={enregistrer} className="max-w-[420px]">
          <p className="max-w-[46ch] text-[15px] text-muted-foreground">{T.aide}</p>

          <div className="mt-6 space-y-5">
            <div>
              <label htmlFor="mdp" className="label-mono">
                {T.champ}
              </label>
              <input
                id="mdp"
                type="password"
                value={mdp}
                onChange={(e) => setMdp(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
                className={`${champ} mt-2`}
              />
            </div>

            <div>
              <label htmlFor="mdp-bis" className="label-mono">
                {T.confirmation}
              </label>
              <input
                id="mdp-bis"
                type="password"
                value={bis}
                onChange={(e) => setBis(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
                className={`${champ} mt-2`}
              />
            </div>
          </div>

          {erreur && (
            <p className="mt-5 border border-border bg-card px-4 py-3 text-[15px] text-foreground">
              {erreur}
            </p>
          )}

          <div className="mt-7 flex items-center gap-6">
            <button
              type="submit"
              disabled={etat === "envoi"}
              className="inline-flex min-h-[52px] items-center border border-primary bg-primary px-8 text-xs font-semibold uppercase tracking-[0.1em] text-primary-foreground transition-colors hover:bg-transparent hover:text-primary disabled:opacity-60"
            >
              {etat === "envoi" && <Loader2 className="mr-3 h-4 w-4 animate-spin" />}
              {etat === "envoi" ? T.encours : T.valider}
            </button>
            <button
              type="button"
              onClick={() => {
                setOuvert(false);
                setErreur(null);
                setMdp("");
                setBis("");
              }}
              className="label-mono text-muted-foreground"
            >
              {T.fermer}
            </button>
          </div>
        </form>
      )}
    </section>
  );
};

export default MotDePasse;
