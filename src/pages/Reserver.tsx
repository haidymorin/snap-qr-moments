import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, Check } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { CONTACT_EMAIL } from "./Contact";

/* Réserver sa date.
 *
 * Cette page existe parce qu'on ne peut pas encore encaisser, et elle est
 * utile même quand on pourra : un mariage se décide six à douze mois avant,
 * la date est la seule information qui permette de savoir quand écrire, et
 * demander une date coûte infiniment moins qu'un paiement à quelqu'un qui
 * découvre le service.
 *
 * Trois choix qui ne sont pas anodins :
 *
 *   · Aucune nouvelle table, aucune nouvelle fonction serveur. La demande
 *     part dans `demandes_contact` par la fonction `contact` déjà déployée.
 *     Une réservation est une demande, avec un type qui le dit. Ajouter une
 *     table aurait voulu dire une migration et un déploiement de plus avant
 *     de pouvoir poster quoi que ce soit.
 *
 *   · Aucune promesse fausse. On ne dit pas « plus que 3 places », on ne
 *     donne pas de date d'ouverture qu'on ne tiendra peut-être pas. Ce qui
 *     est promis — le tarif affiché aujourd'hui, un e-mail à l'ouverture,
 *     zéro engagement — est tenable sans rien faire.
 *
 *   · La date du mariage est obligatoire. C'est tout l'objet de la page.
 */

const TEXTES = {
  fr: {
    eyebrow: "Avant l'ouverture",
    titre: "Réservez votre date.",
    chapo:
      "Les commandes ouvrent dans quelques jours. Laissez-nous votre date : nous vous écrivons dès l'ouverture, et vous gardez le tarif affiché aujourd'hui.",
    argus: [
      {
        titre: "Rien à payer",
        corps: "Aucune carte, aucun acompte, aucun engagement. Vous laissez une date, c'est tout.",
      },
      {
        titre: "Le tarif d'aujourd'hui",
        corps: "Nos prix de lancement vous restent acquis, même s'ils montent d'ici votre mariage.",
      },
      {
        titre: "Prévenue la première",
        corps: "Un e-mail le jour de l'ouverture. Pas de lettre d'information, pas de relance.",
      },
    ],
    noms: "Vos prénoms",
    nomsAide: "Léa & Yohan, par exemple — c'est ce qui s'imprimera sur les cartons.",
    date: "La date du mariage",
    dateAide: "Une date approximative suffit, elle se corrige plus tard.",
    email: "Votre adresse e-mail",
    emailAide: "C'est là que part le message d'ouverture, et nulle part ailleurs.",
    formule: "La formule qui vous intéresse",
    formuleAide: "Facultatif — rien n'est figé.",
    formules: [
      { id: "", nom: "Je ne sais pas encore" },
      { id: "essentiel", nom: "Essentiel" },
      { id: "souvenir", nom: "Souvenir" },
      { id: "heritage", nom: "Héritage" },
    ],
    invites: "Combien d'invités, à peu près",
    invitesAide: "Facultatif — ça nous aide à préparer le bon format d'album.",
    envoyer: "Réserver ma date",
    envoi: "Envoi",
    merciTitre: "C'est noté.",
    merciCorps:
      "Votre date est enregistrée. Vous recevrez un e-mail à l'ouverture des commandes, et vous garderez le tarif affiché aujourd'hui.",
    merciSuite: "En attendant, vous pouvez regarder à quoi ressemble une galerie.",
    merciLien: "Voir une galerie",
    voirTarifs: "Voir les formules et les prix",
    question: "Une question avant de réserver ?",
    questionLien: "Nous écrire",
    rgpd:
      "Votre date et votre adresse servent uniquement à vous prévenir de l'ouverture. Elles ne sont transmises à personne, et un mot de votre part suffit à les effacer.",
    erreurs: {
      noms_invalides: "Il manque vos prénoms.",
      email_invalide: "Cette adresse e-mail ne semble pas valide.",
      date_manquante: "Il manque la date du mariage.",
      date_passee: "Cette date est déjà passée.",
      trop_de_demandes: "Cette adresse a déjà réservé plusieurs fois cette heure-ci.",
      defaut: "L'envoi n'a pas abouti. Réessayez, ou écrivez directement à",
    },
  },
  en: {
    eyebrow: "Before we open",
    titre: "Save your date.",
    chapo:
      "Orders open in a few days. Leave us your date: we will write to you the day we open, and you keep today's price.",
    argus: [
      {
        titre: "Nothing to pay",
        corps: "No card, no deposit, no commitment. You leave a date, that is all.",
      },
      {
        titre: "Today's price",
        corps: "Our launch prices stay yours, even if they go up before your wedding.",
      },
      {
        titre: "First to know",
        corps: "One email on opening day. No newsletter, no follow-ups.",
      },
    ],
    noms: "Your first names",
    nomsAide: "Léa & Yohan, for instance — this is what gets printed on the cards.",
    date: "The wedding date",
    dateAide: "A rough date is enough, it can be corrected later.",
    email: "Your email address",
    emailAide: "That is where the opening message goes, and nowhere else.",
    formule: "The plan you have in mind",
    formuleAide: "Optional — nothing is settled.",
    formules: [
      { id: "", nom: "I do not know yet" },
      { id: "essentiel", nom: "Essential" },
      { id: "souvenir", nom: "Souvenir" },
      { id: "heritage", nom: "Heritage" },
    ],
    invites: "Roughly how many guests",
    invitesAide: "Optional — it helps us prepare the right album size.",
    envoyer: "Save my date",
    envoi: "Sending",
    merciTitre: "Noted.",
    merciCorps:
      "Your date is saved. You will get an email when orders open, and you will keep today's price.",
    merciSuite: "In the meantime, you can see what a gallery looks like.",
    merciLien: "See a gallery",
    voirTarifs: "See the plans and prices",
    question: "A question before you book?",
    questionLien: "Write to us",
    rgpd:
      "Your date and address are only used to tell you when we open. They are passed to no one, and one word from you is enough to erase them.",
    erreurs: {
      noms_invalides: "Your first names are missing.",
      email_invalide: "That email address does not look valid.",
      date_manquante: "The wedding date is missing.",
      date_passee: "That date has already passed.",
      trop_de_demandes: "This address has already booked several times this hour.",
      defaut: "It could not be sent. Try again, or write directly to",
    },
  },
} as const;

type Etat = "saisie" | "envoi" | "envoye";

const champ =
  "min-h-[52px] w-full rounded-xl border border-border bg-card px-4 text-[15px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground";

const Reserver = () => {
  const { lang } = useLanguage();
  const T = TEXTES[lang === "en" ? "en" : "fr"];
  const [params] = useSearchParams();

  const [etat, setEtat] = useState<Etat>("saisie");
  const [erreur, setErreur] = useState<string | null>(null);
  const [form, setForm] = useState({
    noms: "",
    date: "",
    email: "",
    formule: params.get("formule") ?? "",
    invites: "",
    site: "", // champ piège, jamais rempli par un humain
  });

  const modifier = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => setForm({ ...form, [e.target.name]: e.target.value });

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (etat === "envoi") return;

    if (form.noms.trim().length < 2) return setErreur(T.erreurs.noms_invalides);
    if (!form.date) return setErreur(T.erreurs.date_manquante);
    if (form.date < new Date().toISOString().slice(0, 10))
      return setErreur(T.erreurs.date_passee);

    setErreur(null);
    setEtat("envoi");

    const nomFormule =
      T.formules.find((f) => f.id === form.formule)?.nom ?? form.formule;

    /* Le message reprend tout : la fonction serveur n'a que cinq colonnes, et
       on ne veut perdre ni le nombre d'invités ni la formule envisagée. */
    const recap = [
      "RÉSERVATION DE DATE (aucun paiement)",
      "",
      `Prénoms : ${form.noms.trim()}`,
      `Date du mariage : ${form.date}`,
      `Formule envisagée : ${form.formule ? nomFormule : "non précisée"}`,
      `Invités (estimation) : ${form.invites.trim() || "non précisé"}`,
      `Langue du site : ${lang}`,
    ].join("\n");

    try {
      const { data, error } = await supabase.functions.invoke("contact", {
        body: {
          nom: form.noms.trim(),
          email: form.email.trim(),
          type: form.formule
            ? `Réservation de date — ${nomFormule}`
            : "Réservation de date",
          date: form.date,
          message: recap,
          site: form.site,
        },
      });

      /* invoke() masque le corps des réponses en erreur : sans cette
         relecture, une adresse invalide et une panne donneraient le même
         message au visiteur. Le détail est dans error.context. */
      let code: string | null =
        (data as { error?: string } | null)?.error ?? null;
      if (error) {
        code = "defaut";
        const ctx = (error as { context?: Response }).context;
        if (ctx && typeof ctx.json === "function") {
          try {
            const corps = (await ctx.json()) as { error?: string };
            if (corps?.error) code = corps.error;
          } catch {
            /* réponse non lisible : on garde « defaut » */
          }
        }
      }

      if (code) {
        const messages = T.erreurs as Record<string, string>;
        setErreur(messages[code] ?? T.erreurs.defaut);
        setEtat("saisie");
        return;
      }

      setEtat("envoye");
    } catch {
      setErreur(T.erreurs.defaut);
      setEtat("saisie");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,48px)] py-[clamp(48px,7vw,92px)]">
        {etat === "envoye" ? (
          <div className="mx-auto max-w-[56ch] text-center">
            <span
              aria-hidden
              className="mx-auto flex size-12 items-center justify-center rounded-full border border-primary text-primary"
            >
              <Check className="h-5 w-5" />
            </span>
            <h1 className="mt-6 text-[clamp(30px,4.4vw,50px)]">{T.merciTitre}</h1>
            <p className="mt-5 leading-relaxed text-muted-foreground">{T.merciCorps}</p>
            <p className="mt-4 leading-relaxed text-muted-foreground">{T.merciSuite}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/demo"
                className="inline-flex min-h-[48px] items-center rounded-full border border-primary bg-primary px-7 py-4 text-xs font-semibold uppercase tracking-[0.1em] text-primary-foreground transition-colors hover:bg-transparent hover:text-primary"
              >
                {T.merciLien}
              </Link>
              <Link
                to="/pricing"
                className="inline-flex min-h-[48px] items-center rounded-full border border-border px-7 py-4 text-xs font-semibold uppercase tracking-[0.1em] text-foreground transition-colors hover:border-primary"
              >
                {T.voirTarifs}
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-[clamp(36px,5vw,72px)] lg:grid-cols-[1fr_minmax(0,480px)]">
            <div>
              <p className="eyebrow">{T.eyebrow}</p>
              <h1 className="mt-3 max-w-[22ch] text-[clamp(34px,5.6vw,64px)] text-wrap balance">
                {T.titre}
              </h1>
              <p className="mt-5 max-w-[52ch] text-[clamp(15.5px,1.6vw,17.5px)] leading-relaxed text-muted-foreground">
                {T.chapo}
              </p>

              <ul className="mt-9 grid gap-5 sm:grid-cols-3 lg:grid-cols-1">
                {T.argus.map((a) => (
                  <li key={a.titre} className="border-t border-border pt-4">
                    <strong className="block text-[15px] font-semibold text-foreground">
                      {a.titre}
                    </strong>
                    <span className="mt-1 block max-w-[44ch] text-[14px] leading-relaxed text-muted-foreground">
                      {a.corps}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="mt-9 text-[13.5px] text-muted-foreground">
                {T.question}{" "}
                <Link to="/contact" className="border-b border-foreground text-foreground">
                  {T.questionLien}
                </Link>
              </p>
            </div>

            <form onSubmit={envoyer} noValidate className="rounded-2xl border border-border bg-card p-[clamp(20px,3vw,32px)]">
              <label className="label-mono block" htmlFor="noms">{T.noms}</label>
              <p className="mt-1 text-[13px] text-muted-foreground">{T.nomsAide}</p>
              <input
                id="noms" name="noms" value={form.noms} onChange={modifier}
                maxLength={80} autoComplete="name" required
                placeholder="Léa & Yohan" className={champ + " mt-2"}
              />

              <label className="label-mono mt-6 block" htmlFor="date">{T.date}</label>
              <p className="mt-1 text-[13px] text-muted-foreground">{T.dateAide}</p>
              <input
                id="date" name="date" type="date" value={form.date} onChange={modifier}
                min={new Date().toISOString().slice(0, 10)} required
                className={champ + " mt-2"}
              />

              <label className="label-mono mt-6 block" htmlFor="email">{T.email}</label>
              <p className="mt-1 text-[13px] text-muted-foreground">{T.emailAide}</p>
              <input
                id="email" name="email" type="email" value={form.email} onChange={modifier}
                maxLength={160} autoComplete="email" required
                placeholder="vous@exemple.fr" className={champ + " mt-2"}
              />

              <label className="label-mono mt-6 block" htmlFor="formule">{T.formule}</label>
              <p className="mt-1 text-[13px] text-muted-foreground">{T.formuleAide}</p>
              <select
                id="formule" name="formule" value={form.formule} onChange={modifier}
                className={champ + " mt-2 cursor-pointer"}
              >
                {T.formules.map((f) => (
                  <option key={f.id || "inconnue"} value={f.id}>{f.nom}</option>
                ))}
              </select>

              <label className="label-mono mt-6 block" htmlFor="invites">{T.invites}</label>
              <p className="mt-1 text-[13px] text-muted-foreground">{T.invitesAide}</p>
              <input
                id="invites" name="invites" value={form.invites} onChange={modifier}
                maxLength={10} inputMode="numeric"
                placeholder="120" className={champ + " mt-2"}
              />

              {/* Champ piège : invisible pour un humain, rempli par les robots. */}
              <input
                name="site" value={form.site} onChange={modifier} tabIndex={-1}
                autoComplete="off" aria-hidden className="hidden"
              />

              {erreur && (
                <p role="alert" className="mt-5 text-[14px] text-destructive">
                  {erreur}
                  {erreur === T.erreurs.defaut && (
                    <>
                      {" "}
                      <a href={"mailto:" + CONTACT_EMAIL} className="border-b border-destructive">
                        {CONTACT_EMAIL}
                      </a>
                    </>
                  )}
                </p>
              )}

              <button
                type="submit" disabled={etat === "envoi"}
                className="mt-7 inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full border border-primary bg-primary px-7 text-xs font-semibold uppercase tracking-[0.1em] text-primary-foreground transition-colors hover:bg-transparent hover:text-primary disabled:opacity-60"
              >
                {etat === "envoi" && <Loader2 className="h-4 w-4 animate-spin" />}
                {etat === "envoi" ? T.envoi : T.envoyer}
              </button>

              <p className="mt-5 text-[12.5px] leading-relaxed text-muted-foreground">
                {T.rgpd}
              </p>
            </form>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Reserver;
