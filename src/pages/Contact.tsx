import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

/* L'adresse à laquelle les demandes arrivent réellement. */
export const CONTACT_EMAIL = "contact@qr-memories.fr";

/* Ce formulaire ouvrait la messagerie du visiteur. Sur un ordinateur sans
   messagerie configurée — la plupart — il ne se passait rien, et la demande
   disparaissait sans que personne ne le sache. Elle part maintenant vers une
   fonction serveur qui l'écrit en base avant de la notifier par e-mail.

   Il ne sert plus non plus à « créer un événement » : ça, c'est la page des
   tarifs, qui encaisse et crée le compte. Ici on répond aux questions. */

const TEXTES = {
  fr: {
    eyebrow: "Écrire",
    titre: "Une question avant de vous décider ?",
    chapo:
      "Dites-nous en deux lignes ce que vous cherchez. Vous aurez une réponse écrite, pas un formulaire automatique.",
    achat: "Vous savez déjà ce que vous voulez ?",
    achatLien: "Voir les formules",
    nom: "Votre nom",
    email: "Votre adresse e-mail",
    type: "Type d'événement",
    typeAide: "Facultatif",
    date: "Date de l'événement",
    dateAide: "Facultatif",
    message: "Votre message",
    envoyer: "Envoyer",
    envoi: "Envoi",
    merciTitre: "C'est parti.",
    merciCorps:
      "Votre demande est enregistrée. Réponse sous 24 heures, souvent bien avant.",
    autre: "Écrire un autre message",
    erreurs: {
      nom_invalide: "Il manque votre nom.",
      email_invalide: "Cette adresse e-mail ne semble pas valide.",
      date_invalide: "Cette date n'est pas valide.",
      trop_de_demandes:
        "Vous nous avez déjà écrit plusieurs fois cette heure-ci. Laissez-nous le temps de vous répondre.",
      message_court: "Dites-nous quelques mots de plus.",
      defaut: "L'envoi n'a pas abouti. Réessayez, ou écrivez directement à",
    },
  },
  en: {
    eyebrow: "Write",
    titre: "A question before you decide?",
    chapo:
      "Tell us in two lines what you are looking for. You will get a written reply, not an automated form.",
    achat: "Already know what you want?",
    achatLien: "See the plans",
    nom: "Your name",
    email: "Your email address",
    type: "Type of event",
    typeAide: "Optional",
    date: "Date of the event",
    dateAide: "Optional",
    message: "Your message",
    envoyer: "Send",
    envoi: "Sending",
    merciTitre: "On its way.",
    merciCorps: "Your message is recorded. A reply within 24 hours, usually sooner.",
    autre: "Write another message",
    erreurs: {
      nom_invalide: "Your name is missing.",
      email_invalide: "That email address does not look valid.",
      date_invalide: "That date is not valid.",
      trop_de_demandes:
        "You have already written to us several times this hour. Give us time to reply.",
      message_court: "Tell us a little more.",
      defaut: "The message could not be sent. Try again, or write directly to",
    },
  },
} as const;

type Etat = "saisie" | "envoi" | "envoye";

const champ =
  "min-h-[52px] w-full border border-border bg-card px-4 text-[15px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground";

const Contact = () => {
  const { lang } = useLanguage();
  const T = TEXTES[lang === "en" ? "en" : "fr"];

  const [etat, setEtat] = useState<Etat>("saisie");
  const [erreur, setErreur] = useState<string | null>(null);
  const [form, setForm] = useState({
    nom: "",
    email: "",
    type: "",
    date: "",
    message: "",
    site: "", // champ piège, jamais rempli par un humain
  });

  const modifier = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (etat === "envoi") return;

    if (form.message.trim().length < 10) {
      setErreur(T.erreurs.message_court);
      return;
    }

    setErreur(null);
    setEtat("envoi");

    try {
      const { data, error } = await supabase.functions.invoke("contact", { body: form });

      /* invoke() masque le corps des réponses en erreur : sans cette
         relecture, un « nom manquant » et une panne de serveur donneraient
         le même message. Le détail est dans error.context, la réponse brute. */
      let motif = (data as { error?: string } | null)?.error ?? "";
      if (error && !motif) {
        try {
          const brut = await (error as { context?: Response }).context?.clone().json();
          motif = (brut as { error?: string } | undefined)?.error ?? "";
        } catch {
          /* Pas de corps lisible : on retombera sur le message général. */
        }
      }

      if (error || !data?.ok) {
        const connus = T.erreurs as Record<string, string>;
        setErreur(connus[motif] ?? `${T.erreurs.defaut} ${CONTACT_EMAIL}`);
        setEtat("saisie");
        return;
      }

      setEtat("envoye");
    } catch {
      setErreur(`${T.erreurs.defaut} ${CONTACT_EMAIL}`);
      setEtat("saisie");
    }
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto w-full max-w-[720px] px-6 pb-24 pt-32">
        {etat === "envoye" ? (
          <>
            <p className="label-mono">{T.eyebrow}</p>
            <h1 className="mt-4 text-[clamp(34px,5vw,52px)] leading-[1.05]">{T.merciTitre}</h1>
            <p className="mt-6 max-w-[46ch] text-[17px] leading-relaxed text-muted-foreground">
              {T.merciCorps}
            </p>
            <button
              type="button"
              onClick={() => {
                setForm({ nom: "", email: "", type: "", date: "", message: "", site: "" });
                setEtat("saisie");
              }}
              className="label-mono mt-10 border-b border-foreground pb-1 text-foreground"
            >
              {T.autre}
            </button>
          </>
        ) : (
          <>
            <p className="label-mono">{T.eyebrow}</p>
            <h1 className="mt-4 text-[clamp(34px,5vw,52px)] leading-[1.05]">{T.titre}</h1>
            <p className="mt-6 max-w-[52ch] text-[17px] leading-relaxed text-muted-foreground">
              {T.chapo}
            </p>

            <p className="mt-4 text-[15px] text-muted-foreground">
              {T.achat}{" "}
              <Link to="/pricing" className="border-b border-foreground text-foreground">
                {T.achatLien}
              </Link>
            </p>

            <form onSubmit={envoyer} className="mt-12 border-t border-border pt-10">
              <div className="space-y-7">
                <div>
                  <label htmlFor="nom" className="label-mono">
                    {T.nom}
                  </label>
                  <input
                    id="nom"
                    name="nom"
                    value={form.nom}
                    onChange={modifier}
                    required
                    maxLength={80}
                    autoComplete="name"
                    className={`${champ} mt-2`}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="label-mono">
                    {T.email}
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={modifier}
                    required
                    maxLength={160}
                    autoComplete="email"
                    className={`${champ} mt-2`}
                  />
                </div>

                <div className="grid gap-7 sm:grid-cols-2">
                  <div>
                    <label htmlFor="type" className="label-mono">
                      {T.type}
                    </label>
                    <input
                      id="type"
                      name="type"
                      value={form.type}
                      onChange={modifier}
                      maxLength={80}
                      placeholder="Mariage"
                      className={`${champ} mt-2`}
                    />
                    <p className="mt-2 text-xs text-muted-foreground">{T.typeAide}</p>
                  </div>

                  <div>
                    <label htmlFor="date" className="label-mono">
                      {T.date}
                    </label>
                    <input
                      id="date"
                      name="date"
                      type="date"
                      value={form.date}
                      onChange={modifier}
                      className={`${champ} mt-2`}
                    />
                    <p className="mt-2 text-xs text-muted-foreground">{T.dateAide}</p>
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className="label-mono">
                    {T.message}
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={form.message}
                    onChange={modifier}
                    required
                    rows={6}
                    maxLength={4000}
                    className={`${champ} mt-2 resize-none py-3 leading-relaxed`}
                  />
                </div>

                {/* Champ piège : caché aux humains, rempli par les robots. */}
                <input
                  type="text"
                  name="site"
                  value={form.site}
                  onChange={modifier}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="absolute left-[-9999px] h-0 w-0 opacity-0"
                />
              </div>

              {erreur && (
                <p className="mt-7 border border-border bg-card px-4 py-3 text-[15px] text-foreground">
                  {erreur}
                </p>
              )}

              <button
                type="submit"
                disabled={etat === "envoi"}
                className="mt-10 inline-flex min-h-[52px] items-center border border-primary bg-primary px-8 text-xs font-semibold uppercase tracking-[0.1em] text-primary-foreground transition-colors hover:bg-transparent hover:text-primary disabled:opacity-60"
              >
                {etat === "envoi" && <Loader2 className="mr-3 h-4 w-4 animate-spin" />}
                {etat === "envoi" ? T.envoi : T.envoyer}
              </button>
            </form>

            <p className="label-mono mt-12 border-t border-border pt-5">{CONTACT_EMAIL}</p>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
