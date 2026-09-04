import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage, Lang } from "@/contexts/LanguageContext";
import { FORMULES } from "@/data/formules";
import { enregistrerClient } from "@/lib/clients";
import { startCheckout, renoncementRequis, joursAvant, type PlanId } from "@/lib/checkout";
import { Loader2 } from "lucide-react";

/* Le parcours d'achat, en trois pas.
 *
 * Avant, un bouton sur la grille des tarifs ouvrait une petite fenêtre de
 * trois champs et envoyait aussitôt vers la page bancaire. Demander une carte
 * au deuxième clic à quelqu'un qui découvre le service, c'est demander une
 * confiance qu'on n'a rien fait pour mériter.
 *
 * On inverse : la personne dit d'abord qui elle est et ce qu'elle organise,
 * elle choisit ensuite sa formule en connaissance de cause, elle relit tout,
 * et le paiement n'arrive qu'à la fin. Chaque pas répond à une question qu'on
 * se pose dans cet ordre-là.
 *
 * Effet de bord, et il n'est pas mince : les coordonnées sont enregistrées au
 * pas 1, avant le paiement. Une personne qui abandonne devant la page bancaire
 * laissait jusqu'ici zéro trace.
 */

type Etape = 1 | 2 | 3;

const TYPES = ["mariage", "anniversaire", "bapteme", "entreprise", "autre"] as const;

const TEXTES: Record<Lang, {
  titre: string; chapo: string;
  pas: string[];
  suivant: string; retour: string;
  /* Pas 1 */
  vousTitre: string; vousChapo: string;
  prenom: string; nom: string; email: string; emailAide: string;
  telephone: string; telephoneAide: string; facultatif: string;
  evTitre: string;
  evNom: string; evNomAide: string; evNomExemple: string;
  evDate: string; evDateAide: string;
  evType: string; typeChoisir: string;
  types: Record<string, string>;
  marketing: string;
  donnees: string;
  /* Pas 2 */
  formuleTitre: string; formuleChapo: string;
  choisie: string; choisir: string; voirDetail: string; masquerDetail: string;
  /* Pas 3 */
  recapTitre: string; recapChapo: string;
  recapVous: string; recapEvenement: string; recapFormule: string; recapTotal: string;
  modifier: string;
  renoncementTitre: (j: number) => string;
  renoncement: string; renoncementPourquoi: string;
  payer: string; envoi: string; securite: string;
  apres: string;
  erreurs: Record<string, string>;
}> = {
  fr: {
    titre: "Créer mon événement",
    chapo: "Trois pas. Vous ne payez qu'au dernier, une fois que vous avez tout relu.",
    pas: ["Vous et votre événement", "Votre formule", "Récapitulatif et paiement"],
    suivant: "Continuer",
    retour: "Revenir",
    vousTitre: "Qui êtes-vous ?",
    vousChapo:
      "C'est à cette adresse que nous enverrons votre QR code, le lien de votre galerie et votre facture.",
    prenom: "Prénom",
    nom: "Nom",
    email: "Adresse email",
    emailAide: "Vérifiez-la bien : tout part là-bas.",
    telephone: "Téléphone",
    telephoneAide: "Uniquement si vous préférez qu'on vous appelle en cas de souci le jour J.",
    facultatif: "facultatif",
    evTitre: "Et votre événement ?",
    evNom: "Nom de l'événement",
    evNomAide: "C'est le titre que vos invités verront en haut de la page de dépôt.",
    evNomExemple: "Mariage de Camille et Sacha",
    evDate: "Date de l'événement",
    evDateAide: "Elle décide de la date de fermeture de votre galerie, six mois plus tard.",
    evType: "Type d'événement",
    typeChoisir: "Choisir",
    types: {
      mariage: "Mariage",
      anniversaire: "Anniversaire",
      bapteme: "Baptême",
      entreprise: "Événement d'entreprise",
      autre: "Autre",
    },
    marketing:
      "J'accepte de recevoir par email les conseils et nouveautés de QR Memories. Une adresse pour se désinscrire figure dans chaque message.",
    donnees:
      "Vos coordonnées servent à créer votre événement et à vous envoyer vos accès. Elles ne sont ni vendues ni transmises à des tiers.",
    formuleTitre: "Quelle formule ?",
    formuleChapo:
      "Vous pourrez passer à une formule supérieure plus tard, tant que votre galerie est en ligne, en ne payant que la différence.",
    choisie: "Formule choisie",
    choisir: "Choisir cette formule",
    voirDetail: "Voir tout ce qui est compris",
    masquerDetail: "Masquer le détail",
    recapTitre: "On relit tout ensemble.",
    recapChapo: "Rien n'est encore payé. Vérifiez, corrigez si besoin, et validez.",
    recapVous: "Vos coordonnées",
    recapEvenement: "Votre événement",
    recapFormule: "Votre formule",
    recapTotal: "Total à payer, une seule fois",
    modifier: "Modifier",
    renoncementTitre: (j) =>
      j <= 0 ? "Votre événement a lieu aujourd'hui." : `Votre événement a lieu dans ${j} jour${j > 1 ? "s" : ""}.`,
    renoncement:
      "Je demande que le service commence immédiatement et je reconnais perdre mon droit de rétractation de quatorze jours une fois ma galerie ouverte.",
    renoncementPourquoi:
      "Sans cette autorisation, la loi nous oblige à attendre quatorze jours avant d'ouvrir votre galerie — soit après votre fête.",
    payer: "Payer et ouvrir mon espace",
    envoi: "Redirection vers le paiement…",
    securite:
      "Paiement par carte, traité par Stripe. Votre numéro de carte ne passe jamais par nos serveurs.",
    apres:
      "Juste après le paiement, votre tableau de bord s'ouvre : votre QR code y est déjà, ainsi que les affiches à imprimer.",
    erreurs: {
      prenom: "Indiquez votre prénom.",
      nom: "Indiquez votre nom.",
      email: "Cette adresse email ne semble pas valide.",
      evNom: "Donnez un nom à votre événement.",
      evDate: "Indiquez la date de votre événement.",
      evDatePassee: "Cette date est déjà passée.",
      evType: "Choisissez le type d'événement.",
      formule: "Choisissez une formule.",
      renoncement: "Cochez la case pour que nous puissions ouvrir votre galerie à temps.",
    },
  },

  en: {
    titre: "Create my event",
    chapo: "Three steps. You only pay at the last one, once you have read it all back.",
    pas: ["You and your event", "Your plan", "Summary and payment"],
    suivant: "Continue",
    retour: "Back",
    vousTitre: "Who are you?",
    vousChapo:
      "This is the address we will send your QR code, your gallery link and your invoice to.",
    prenom: "First name",
    nom: "Last name",
    email: "Email address",
    emailAide: "Check it carefully: everything goes there.",
    telephone: "Phone",
    telephoneAide: "Only if you would rather we called you should anything go wrong on the day.",
    facultatif: "optional",
    evTitre: "And your event?",
    evNom: "Event name",
    evNomAide: "This is the title your guests will see at the top of the upload page.",
    evNomExemple: "Camille and Sacha's wedding",
    evDate: "Event date",
    evDateAide: "It sets the closing date of your gallery, six months later.",
    evType: "Event type",
    typeChoisir: "Choose",
    types: {
      mariage: "Wedding",
      anniversaire: "Birthday",
      bapteme: "Christening",
      entreprise: "Company event",
      autre: "Other",
    },
    marketing:
      "I agree to receive QR Memories tips and news by email. Every message carries an unsubscribe link.",
    donnees:
      "Your details are used to create your event and send you your access. They are never sold or passed on.",
    formuleTitre: "Which plan?",
    formuleChapo:
      "You can move up a plan later, while your gallery is online, paying only the difference.",
    choisie: "Chosen plan",
    choisir: "Choose this plan",
    voirDetail: "See everything included",
    masquerDetail: "Hide the detail",
    recapTitre: "Let's read it all back.",
    recapChapo: "Nothing has been paid yet. Check, correct if needed, then confirm.",
    recapVous: "Your details",
    recapEvenement: "Your event",
    recapFormule: "Your plan",
    recapTotal: "Total to pay, once",
    modifier: "Edit",
    renoncementTitre: (j) => (j <= 0 ? "Your event is today." : `Your event is in ${j} day${j > 1 ? "s" : ""}.`),
    renoncement:
      "I ask for the service to start immediately and accept that I lose my fourteen-day right to withdraw once my gallery is open.",
    renoncementPourquoi:
      "Without this, the law requires us to wait fourteen days before opening your gallery — that is, after your party.",
    payer: "Pay and open my space",
    envoi: "Taking you to payment…",
    securite: "Card payment handled by Stripe. Your card number never passes through our servers.",
    apres:
      "Right after payment your dashboard opens: your QR code is already there, along with the signs to print.",
    erreurs: {
      prenom: "Please give your first name.",
      nom: "Please give your last name.",
      email: "That email address does not look valid.",
      evNom: "Please name your event.",
      evDate: "Please give your event date.",
      evDatePassee: "That date has already passed.",
      evType: "Please choose the event type.",
      formule: "Please choose a plan.",
      renoncement: "Tick the box so we can open your gallery in time.",
    },
  },
};

const emailValide = (v: string) => /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(v.trim());

/* Un champ, son libellé, son aide et son erreur. Les trois vont ensemble :
   séparés, on finit toujours par en oublier un. */
function Champ({
  id, label, aide, erreur, facultatif, children,
}: {
  id: string; label: string; aide?: string; erreur?: string;
  facultatif?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[14px] font-semibold text-foreground">
        {label}
        {facultatif && (
          <span className="ml-2 font-normal text-muted-foreground">({facultatif})</span>
        )}
      </label>
      {aide && <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{aide}</p>}
      <div className="mt-2">{children}</div>
      {erreur && <p className="mt-1.5 text-[13px] text-destructive">{erreur}</p>}
    </div>
  );
}

const champStyle =
  "min-h-[48px] w-full rounded-xl border border-border bg-background px-4 py-3 text-[15px] text-foreground outline-none transition-colors focus:border-primary";

const CreerEvenement = () => {
  const { lang } = useLanguage();
  const T = TEXTES[lang];
  const formules = FORMULES[lang];
  const [params] = useSearchParams();

  const [etape, setEtape] = useState<Etape>(1);
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [marketing, setMarketing] = useState(false);
  const [evNom, setEvNom] = useState("");
  const [evDate, setEvDate] = useState("");
  const [evType, setEvType] = useState("");
  const [plan, setPlan] = useState<PlanId | null>(null);
  const [ouvert, setOuvert] = useState<PlanId | null>(null);
  const [renonce, setRenonce] = useState(false);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  const [panne, setPanne] = useState<string | null>(null);

  /* Un lien « Choisir l'Essentiel » depuis la page des tarifs arrive ici avec
     la formule déjà cochée — mais toujours au pas 1 : les coordonnées restent
     la première chose demandée. */
  useEffect(() => {
    const p = params.get("formule");
    if (p === "essentiel" || p === "souvenir" || p === "heritage") setPlan(p);
  }, [params]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [etape]);

  const jours = useMemo(() => joursAvant(evDate), [evDate]);
  const besoinRenoncement = useMemo(() => renoncementRequis(evDate), [evDate]);
  const choisie = plan ? formules.find((f) => f.id === plan) : null;

  const validerPas1 = () => {
    const e: Record<string, string> = {};
    if (prenom.trim().length < 2) e.prenom = T.erreurs.prenom;
    if (nom.trim().length < 2) e.nom = T.erreurs.nom;
    if (!emailValide(email)) e.email = T.erreurs.email;
    if (evNom.trim().length < 2) e.evNom = T.erreurs.evNom;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(evDate)) e.evDate = T.erreurs.evDate;
    else if ((joursAvant(evDate) ?? -1) < 0) e.evDate = T.erreurs.evDatePassee;
    if (!evType) e.evType = T.erreurs.evType;
    setErreurs(e);
    if (Object.keys(e).length > 0) return;

    /* On enregistre ici, pas après le paiement : c'est tout l'intérêt. */
    void enregistrerClient({
      email: email.trim(),
      prenom: prenom.trim(),
      nom: nom.trim(),
      telephone: telephone.trim(),
      marketing,
      evenementNom: evNom.trim(),
      evenementDate: evDate,
      evenementType: evType,
      formule: plan,
    });

    setEtape(2);
  };

  const validerPas2 = () => {
    if (!plan) {
      setErreurs({ formule: T.erreurs.formule });
      return;
    }
    setErreurs({});
    setEtape(3);
  };

  const payer = async () => {
    if (besoinRenoncement && !renonce) {
      setErreurs({ renoncement: T.erreurs.renoncement });
      return;
    }
    if (!plan) return;
    setErreurs({});
    setPanne(null);
    setEnvoi(true);
    try {
      await startCheckout({
        plan,
        nom: evNom.trim(),
        date: evDate,
        type: evType,
        email: email.trim(),
        executionAnticipee: besoinRenoncement ? renonce : undefined,
      });
    } catch (e) {
      setPanne((e as Error).message);
      setEnvoi(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 pt-[72px]">
        <section className="pb-[clamp(24px,3vw,36px)] pt-[clamp(40px,5vw,68px)]">
          <div className="mx-auto max-w-[760px] px-[clamp(20px,5vw,48px)] text-center">
            <h1 className="text-[clamp(32px,5vw,54px)]">{T.titre}</h1>
            <p className="mx-auto mt-4 max-w-[46ch] leading-relaxed text-muted-foreground">
              {T.chapo}
            </p>
          </div>
        </section>

        {/* Le fil des trois pas */}
        <div className="mx-auto mb-[clamp(24px,3vw,40px)] max-w-[760px] px-[clamp(20px,5vw,48px)]">
          <ol className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {T.pas.map((p, i) => {
              const n = (i + 1) as Etape;
              const fait = etape > n;
              const ici = etape === n;
              return (
                <li key={p} className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={n > etape}
                    onClick={() => setEtape(n)}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] transition-colors disabled:cursor-default ${
                      ici
                        ? "border-primary bg-primary text-primary-foreground"
                        : fait
                          ? "border-border text-foreground hover:border-primary"
                          : "border-border text-muted-foreground"
                    }`}
                  >
                    <span className="label-mono opacity-100">{`0${n}`}</span>
                    <span>{p}</span>
                  </button>
                  {i < T.pas.length - 1 && (
                    <span aria-hidden className="h-px w-5 bg-border sm:w-8" />
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        <section className="pb-[clamp(58px,7.5vw,100px)]">
          <div className="mx-auto max-w-[760px] px-[clamp(20px,5vw,48px)]">

            {/* ───────────── Pas 1 : vous et votre événement ───────────── */}
            {etape === 1 && (
              <div className="space-y-[clamp(22px,2.6vw,32px)]">
                <div className="rounded-2xl border border-border bg-card p-[clamp(22px,2.6vw,32px)]">
                  <h2 className="text-[clamp(22px,2.2vw,28px)]">{T.vousTitre}</h2>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">
                    {T.vousChapo}
                  </p>

                  <div className="mt-6 space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Champ id="prenom" label={T.prenom} erreur={erreurs.prenom}>
                        <input
                          id="prenom" className={champStyle} value={prenom}
                          autoComplete="given-name"
                          onChange={(e) => setPrenom(e.target.value)}
                        />
                      </Champ>
                      <Champ id="nom" label={T.nom} erreur={erreurs.nom}>
                        <input
                          id="nom" className={champStyle} value={nom}
                          autoComplete="family-name"
                          onChange={(e) => setNom(e.target.value)}
                        />
                      </Champ>
                    </div>

                    <Champ id="email" label={T.email} aide={T.emailAide} erreur={erreurs.email}>
                      <input
                        id="email" type="email" inputMode="email" className={champStyle}
                        value={email} autoComplete="email"
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </Champ>

                    <Champ
                      id="telephone" label={T.telephone} aide={T.telephoneAide}
                      facultatif={T.facultatif}
                    >
                      <input
                        id="telephone" type="tel" inputMode="tel" className={champStyle}
                        value={telephone} autoComplete="tel"
                        onChange={(e) => setTelephone(e.target.value)}
                      />
                    </Champ>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-[clamp(22px,2.6vw,32px)]">
                  <h2 className="text-[clamp(22px,2.2vw,28px)]">{T.evTitre}</h2>

                  <div className="mt-6 space-y-5">
                    <Champ id="evNom" label={T.evNom} aide={T.evNomAide} erreur={erreurs.evNom}>
                      <input
                        id="evNom" className={champStyle} value={evNom}
                        placeholder={T.evNomExemple} maxLength={80}
                        onChange={(e) => setEvNom(e.target.value)}
                      />
                    </Champ>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <Champ id="evDate" label={T.evDate} aide={T.evDateAide} erreur={erreurs.evDate}>
                        <input
                          id="evDate" type="date" className={champStyle} value={evDate}
                          min={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => setEvDate(e.target.value)}
                        />
                      </Champ>
                      <Champ id="evType" label={T.evType} erreur={erreurs.evType}>
                        <select
                          id="evType" className={champStyle} value={evType}
                          onChange={(e) => setEvType(e.target.value)}
                        >
                          <option value="">{T.typeChoisir}</option>
                          {TYPES.map((k) => (
                            <option key={k} value={k}>{T.types[k]}</option>
                          ))}
                        </select>
                      </Champ>
                    </div>

                    <label className="flex cursor-pointer gap-3 rounded-xl border border-border bg-background p-4">
                      <input
                        type="checkbox" checked={marketing}
                        onChange={(e) => setMarketing(e.target.checked)}
                        className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                      />
                      <span className="text-[13.5px] leading-relaxed text-foreground">
                        {T.marketing}
                      </span>
                    </label>

                    <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                      {T.donnees}{" "}
                      <Link to="/privacy" className="underline underline-offset-2">
                        {lang === "fr" ? "Notre politique de confidentialité" : "Our privacy policy"}
                      </Link>
                      .
                    </p>
                  </div>
                </div>

                <button
                  type="button" onClick={validerPas1}
                  className="inline-flex min-h-[52px] w-full items-center justify-center rounded-full border border-primary bg-primary px-7 py-4 text-xs font-semibold uppercase tracking-[0.1em] text-primary-foreground transition-colors hover:bg-transparent hover:text-primary"
                >
                  {T.suivant}
                </button>
              </div>
            )}

            {/* ───────────── Pas 2 : la formule ───────────── */}
            {etape === 2 && (
              <div className="space-y-[clamp(18px,2.2vw,26px)]">
                <div>
                  <h2 className="text-[clamp(22px,2.2vw,28px)]">{T.formuleTitre}</h2>
                  <p className="mt-2 max-w-[52ch] text-[14.5px] leading-relaxed text-muted-foreground">
                    {T.formuleChapo}
                  </p>
                </div>

                {formules.map((f) => {
                  const active = plan === f.id;
                  const deplie = ouvert === f.id;
                  return (
                    <article
                      key={f.id}
                      className={`rounded-2xl border bg-card p-[clamp(22px,2.6vw,32px)] transition-colors ${
                        active ? "border-primary" : "border-border"
                      }`}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-[clamp(22px,2.2vw,28px)] leading-none">{f.nom}</h3>
                          {f.badge && (
                            <span className="label-mono rounded-full border border-border px-2.5 py-1 text-foreground opacity-100">
                              {f.badge}
                            </span>
                          )}
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="font-display text-[clamp(30px,3vw,40px)] leading-none">
                            {f.prix}
                          </span>
                          <span className="text-[13px] text-muted-foreground">{f.periode}</span>
                        </div>
                      </div>

                      <p className="mt-4 text-[15px] leading-relaxed text-foreground">{f.resume}</p>

                      <button
                        type="button"
                        onClick={() => setOuvert(deplie ? null : f.id)}
                        aria-expanded={deplie}
                        className="label-mono mt-4 border-b border-foreground pb-0.5 text-foreground opacity-100 transition-opacity hover:opacity-60"
                      >
                        {deplie ? T.masquerDetail : T.voirDetail}
                      </button>

                      {deplie && (
                        <div className="mt-5 border-t border-border pt-5">
                          {f.herite && (
                            <p className="mb-4 text-[14px] font-semibold text-foreground">{f.herite}</p>
                          )}
                          <ul className="space-y-4">
                            {f.points.map((p) => (
                              <li key={p.titre}>
                                <strong className="block text-[14.5px] font-semibold leading-snug text-foreground">
                                  {p.titre}
                                </strong>
                                <span className="mt-1 block text-[13.5px] leading-relaxed text-muted-foreground">
                                  {p.detail}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => { setPlan(f.id); setErreurs({}); }}
                        className={`mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-full border px-6 py-4 text-xs font-semibold uppercase tracking-[0.1em] transition-colors ${
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-foreground hover:border-primary"
                        }`}
                      >
                        {active ? T.choisie : T.choisir}
                      </button>
                    </article>
                  );
                })}

                {erreurs.formule && (
                  <p className="text-[13px] text-destructive">{erreurs.formule}</p>
                )}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button" onClick={() => setEtape(1)}
                    className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-border px-7 py-4 text-xs font-semibold uppercase tracking-[0.1em] text-foreground transition-colors hover:border-primary"
                  >
                    {T.retour}
                  </button>
                  <button
                    type="button" onClick={validerPas2}
                    className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-full border border-primary bg-primary px-7 py-4 text-xs font-semibold uppercase tracking-[0.1em] text-primary-foreground transition-colors hover:bg-transparent hover:text-primary"
                  >
                    {T.suivant}
                  </button>
                </div>
              </div>
            )}

            {/* ───────────── Pas 3 : récapitulatif et paiement ───────────── */}
            {etape === 3 && choisie && (
              <div className="space-y-[clamp(18px,2.2vw,26px)]">
                <div>
                  <h2 className="text-[clamp(22px,2.2vw,28px)]">{T.recapTitre}</h2>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">
                    {T.recapChapo}
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-card">
                  {[
                    {
                      titre: T.recapVous,
                      pas: 1 as Etape,
                      lignes: [
                        `${prenom} ${nom}`.trim(),
                        email,
                        telephone,
                      ].filter(Boolean),
                    },
                    {
                      titre: T.recapEvenement,
                      pas: 1 as Etape,
                      lignes: [
                        evNom,
                        new Date(`${evDate}T12:00:00`).toLocaleDateString(
                          lang === "fr" ? "fr-FR" : "en-GB",
                          { weekday: "long", day: "numeric", month: "long", year: "numeric" },
                        ),
                        T.types[evType],
                      ].filter(Boolean),
                    },
                    {
                      titre: T.recapFormule,
                      pas: 2 as Etape,
                      lignes: [choisie.nom, choisie.resume],
                    },
                  ].map((bloc) => (
                    <div
                      key={bloc.titre}
                      className="flex items-start justify-between gap-4 border-b border-border p-[clamp(18px,2.2vw,26px)] last:border-b-0"
                    >
                      <div>
                        <span className="label-mono text-muted-foreground">{bloc.titre}</span>
                        {bloc.lignes.map((l, i) => (
                          <p
                            key={i}
                            className={
                              i === 0
                                ? "mt-1.5 text-[16px] font-semibold text-foreground"
                                : "mt-0.5 text-[14px] leading-relaxed text-muted-foreground"
                            }
                          >
                            {l}
                          </p>
                        ))}
                      </div>
                      <button
                        type="button" onClick={() => setEtape(bloc.pas)}
                        className="label-mono shrink-0 border-b border-foreground pb-0.5 text-foreground opacity-100 transition-opacity hover:opacity-60"
                      >
                        {T.modifier}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-baseline justify-between gap-4 rounded-2xl border border-primary bg-card px-[clamp(18px,2.2vw,26px)] py-5">
                  <span className="text-[15px] font-semibold text-foreground">{T.recapTotal}</span>
                  <span className="font-display text-[clamp(30px,3vw,40px)] leading-none text-foreground">
                    {choisie.prix}
                  </span>
                </div>

                {besoinRenoncement && jours !== null && (
                  <div className="rounded-2xl border border-border bg-card p-[clamp(18px,2.2vw,26px)]">
                    <p className="text-[15px] font-semibold text-foreground">
                      {T.renoncementTitre(jours)}
                    </p>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                      {T.renoncementPourquoi}
                    </p>
                    <label className="mt-4 flex cursor-pointer gap-3">
                      <input
                        type="checkbox" checked={renonce}
                        onChange={(e) => setRenonce(e.target.checked)}
                        className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                      />
                      <span className="text-[13.5px] leading-relaxed text-foreground">
                        {T.renoncement}
                      </span>
                    </label>
                    {erreurs.renoncement && (
                      <p className="mt-2 text-[13px] text-destructive">{erreurs.renoncement}</p>
                    )}
                  </div>
                )}

                {panne && (
                  <p className="rounded-xl border border-destructive px-4 py-3 text-[14px] text-destructive">
                    {panne}
                  </p>
                )}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button" onClick={() => setEtape(2)} disabled={envoi}
                    className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-border px-7 py-4 text-xs font-semibold uppercase tracking-[0.1em] text-foreground transition-colors hover:border-primary disabled:opacity-50"
                  >
                    {T.retour}
                  </button>
                  <button
                    type="button" onClick={payer} disabled={envoi}
                    className="inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-full border border-primary bg-primary px-7 py-4 text-xs font-semibold uppercase tracking-[0.1em] text-primary-foreground transition-colors hover:bg-transparent hover:text-primary disabled:opacity-60"
                  >
                    {envoi && <Loader2 className="h-4 w-4 animate-spin" />}
                    {envoi ? T.envoi : T.payer}
                  </button>
                </div>

                <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                  {T.securite} {T.apres}
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default CreerEvenement;
