import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2 } from "lucide-react";

/* La page d'arrivée après un paiement accepté.
 *
 * Elle n'attend pas passivement : elle interroge le serveur jusqu'à ce que
 * l'événement existe. Stripe nous prévient en général en une ou deux secondes,
 * parfois en dix — ce n'est pas une panne, c'est le délai normal d'un webhook,
 * et il ne doit surtout pas ressembler à un échec.
 *
 * L'accès au compte est délivré ici plutôt qu'envoyé par e-mail : la personne
 * vient de payer, elle est devant son écran. L'envoyer relever sa boîte mail à
 * cet instant, c'est en perdre la moitié en route. */

const TEXTES = {
  fr: {
    eyebrow: "Paiement reçu",
    attenteTitre: "Nous préparons votre événement.",
    attenteCorps:
      "Quelques secondes, le temps que notre banque nous confirme le paiement. Ne fermez pas cette page.",
    pretTitre: "C'est prêt.",
    pretCorps:
      "Votre galerie existe déjà. Voici le QR code que vos invités scanneront ; vous le retrouverez à tout moment dans votre espace, avec la signalétique à imprimer.",
    palier: "Formule",
    quand: "Date",
    jusqua: "Photos conservées jusqu'au",
    lien: "Lien de vos invités",
    entrer: "Accéder à mon espace",
    entrerAide: "Ce bouton vous connecte directement. Vous pourrez choisir un mot de passe ensuite.",
    entrerEchec: "La connexion automatique n'a pas abouti. Connectez-vous avec votre adresse e-mail.",
    connexion: "Se connecter",
    lenteurTitre: "Le paiement est bien passé.",
    lenteurCorps:
      "Sa confirmation prend plus de temps que d'habitude. Votre événement sera créé automatiquement, sans autre action de votre part. Connectez-vous dans quelques minutes, ou écrivez-nous si vous ne le voyez pas apparaître.",
    reference: "Référence",
    contact: "Nous écrire",
    plans: { essentiel: "Essentiel", souvenir: "Souvenir", heritage: "Héritage" } as Record<string, string>,
  },
  en: {
    eyebrow: "Payment received",
    attenteTitre: "We are setting up your event.",
    attenteCorps:
      "A few seconds, while our bank confirms the payment. Please keep this page open.",
    pretTitre: "All set.",
    pretCorps:
      "Your gallery already exists. Here is the QR code your guests will scan; you will find it again any time in your space, along with the signs to print.",
    palier: "Plan",
    quand: "Date",
    jusqua: "Photos kept until",
    lien: "Your guests' link",
    entrer: "Go to my space",
    entrerAide: "This button signs you in directly. You can set a password afterwards.",
    entrerEchec: "Automatic sign-in did not work. Please sign in with your email address.",
    connexion: "Sign in",
    lenteurTitre: "Your payment went through.",
    lenteurCorps:
      "Confirmation is taking longer than usual. Your event will be created automatically, with nothing more to do on your side. Sign in again in a few minutes, or write to us if it does not appear.",
    reference: "Reference",
    contact: "Contact us",
    plans: { essentiel: "Essential", souvenir: "Souvenir", heritage: "Heritage" } as Record<string, string>,
  },
};

interface Evenement {
  id: string;
  name: string;
  event_date: string;
  event_type: string;
  plan: string;
  expire_le: string | null;
}

/* Une seconde et demie entre deux essais, pendant quarante-cinq secondes.
   Au-delà, ce n'est plus un délai de webhook, c'est un incident : on cesse
   d'interroger et on dit la vérité à la personne. */
const INTERVALLE = 1500;
const LIMITE = 45_000;

const PaiementReussi = () => {
  const { lang } = useLanguage();
  const T = TEXTES[lang === "en" ? "en" : "fr"];
  const [params] = useSearchParams();
  const session = params.get("session_id");

  const [evenement, setEvenement] = useState<Evenement | null>(null);
  const [jeton, setJeton] = useState<string | null>(null);
  const [entree, setEntree] = useState<"prete" | "encours" | "echec">("prete");
  const naviguer = useNavigate();
  const [tropLong, setTropLong] = useState(false);
  const depart = useRef(Date.now());

  const interroger = useCallback(async () => {
    if (!session) return true;
    const { data } = await supabase.functions.invoke("commande-statut", {
      body: { sessionId: session },
    });
    if (data?.statut === "pret" && data.evenement) {
      setEvenement(data.evenement as Evenement);
      setJeton((data.jeton as string) ?? null);
      return true;
    }
    return false;
  }, [session]);

  useEffect(() => {
    if (!session) {
      setTropLong(true);
      return;
    }
    let vivant = true;
    let minuteur: number;

    const tour = async () => {
      if (!vivant) return;
      let fini = false;
      try {
        fini = await interroger();
      } catch {
        /* Une requête ratée n'est pas un échec : on retentera au tour suivant. */
      }
      if (!vivant || fini) return;
      if (Date.now() - depart.current > LIMITE) {
        setTropLong(true);
        return;
      }
      minuteur = window.setTimeout(tour, INTERVALLE);
    };

    tour();
    return () => {
      vivant = false;
      window.clearTimeout(minuteur);
    };
  }, [session, interroger]);

  /* On échange le jeton contre une session ici même, sans quitter la page.
     Passer par le lien tout fait de Supabase ferait transiter la personne par
     une adresse de redirection déclarée ailleurs — c'est ce qui la renvoyait
     sur l'ancien site après le changement de nom de domaine. */
  const entrerDansEspace = async () => {
    if (!jeton) return;
    setEntree("encours");
    const { error } = await supabase.auth.verifyOtp({ token_hash: jeton, type: "magiclink" });
    if (error) {
      setEntree("echec");
      return;
    }
    naviguer("/dashboard");
  };

  const lienInvites = evenement ? `${window.location.origin}/event/${evenement.id}` : "";
  const dateLisible = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", {
      day: "numeric", month: "long", year: "numeric",
    });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto w-full max-w-[860px] px-[clamp(20px,5vw,48px)] py-[clamp(56px,8vw,104px)]">
        <p className="eyebrow">{T.eyebrow}</p>

        {/* ---------- en attente du webhook ---------- */}
        {!evenement && !tropLong && (
          <>
            <h1 className="mt-3 text-[clamp(30px,4.5vw,54px)]">{T.attenteTitre}</h1>
            <p className="lead mt-5 max-w-[46ch]">{T.attenteCorps}</p>
            <Loader2 className="mt-8 h-6 w-6 animate-spin text-muted-foreground" />
          </>
        )}

        {/* ---------- confirmation lente ---------- */}
        {!evenement && tropLong && (
          <>
            <h1 className="mt-3 text-[clamp(30px,4.5vw,54px)]">{T.lenteurTitre}</h1>
            <p className="lead mt-5 max-w-[52ch]">{T.lenteurCorps}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/auth?mode=signin"
                className="inline-flex min-h-[52px] items-center border border-primary bg-primary px-8 text-xs font-semibold uppercase tracking-[0.1em] text-primary-foreground transition-colors hover:bg-transparent hover:text-primary"
              >
                {T.connexion}
              </Link>
              <Link
                to="/contact"
                className="inline-flex min-h-[52px] items-center border border-border px-8 text-xs font-semibold uppercase tracking-[0.1em] transition-colors hover:border-primary"
              >
                {T.contact}
              </Link>
            </div>
          </>
        )}

        {/* ---------- l'événement existe ---------- */}
        {evenement && (
          <>
            <h1 className="mt-3 text-[clamp(30px,4.5vw,54px)]">{T.pretTitre}</h1>
            <p className="lead mt-5 max-w-[50ch]">{T.pretCorps}</p>

            <div className="mt-10 grid gap-10 border-y border-border py-10 md:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <h2 className="text-[clamp(24px,3vw,32px)] leading-tight">{evenement.name}</h2>

                <dl className="mt-7 grid gap-4">
                  <div className="flex items-baseline justify-between gap-6 border-b border-border pb-3">
                    <dt className="label-mono">{T.palier}</dt>
                    <dd className="text-sm">{T.plans[evenement.plan] ?? evenement.plan}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-6 border-b border-border pb-3">
                    <dt className="label-mono">{T.quand}</dt>
                    <dd className="text-sm">{dateLisible(evenement.event_date)}</dd>
                  </div>
                  {evenement.expire_le && (
                    <div className="flex items-baseline justify-between gap-6 border-b border-border pb-3">
                      <dt className="label-mono">{T.jusqua}</dt>
                      <dd className="text-sm">{dateLisible(evenement.expire_le)}</dd>
                    </div>
                  )}
                </dl>

                <p className="label-mono mt-7">{T.lien}</p>
                <p className="mt-2 break-all border border-border bg-card px-4 py-3 font-mono text-[13px]">
                  {lienInvites}
                </p>
              </div>

              <div className="flex flex-col items-center gap-3 md:pl-4">
                <div className="border border-border bg-white p-4">
                  <QRCodeCanvas value={lienInvites} size={168} level="H" />
                </div>
              </div>
            </div>

            <div className="mt-9">
              {jeton && entree !== "echec" ? (
                <>
                  <button
                    type="button"
                    onClick={entrerDansEspace}
                    disabled={entree === "encours"}
                    className="inline-flex min-h-[52px] items-center border border-primary bg-primary px-8 text-xs font-semibold uppercase tracking-[0.1em] text-primary-foreground transition-colors hover:bg-transparent hover:text-primary disabled:opacity-60"
                  >
                    {entree === "encours" && <Loader2 className="mr-3 h-4 w-4 animate-spin" />}
                    {T.entrer}
                  </button>
                  <p className="mt-3 max-w-[44ch] text-xs text-muted-foreground">{T.entrerAide}</p>
                </>
              ) : (
                <>
                  <Link
                    to="/auth?mode=signin"
                    className="inline-flex min-h-[52px] items-center border border-primary bg-primary px-8 text-xs font-semibold uppercase tracking-[0.1em] text-primary-foreground transition-colors hover:bg-transparent hover:text-primary"
                  >
                    {T.connexion}
                  </Link>
                  {entree === "echec" && (
                    <p className="mt-3 max-w-[44ch] text-xs text-muted-foreground">{T.entrerEchec}</p>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {session && (
          <p className="label-mono mt-12 border-t border-border pt-5">
            {T.reference} {session.slice(-12)}
          </p>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default PaiementReussi;
