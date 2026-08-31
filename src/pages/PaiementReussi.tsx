import { Link, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";

/* Page d'arrivée après un paiement accepté.
 *
 * À ce stade, le paiement est encaissé par Stripe mais rien n'est encore
 * rattaché à un compte : c'est l'étape suivante du chantier (webhook +
 * table des commandes). En attendant, on dit clairement à la personne
 * ce qu'elle doit faire, et on garde la référence de sa session. */
const PaiementReussi = () => {
  const { t } = useLanguage();
  const [params] = useSearchParams();
  const session = params.get("session_id");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto flex max-w-[720px] flex-col items-center px-[clamp(20px,5vw,48px)] py-[clamp(64px,9vw,120px)] text-center">
        <p className="eyebrow">{t("paid.eyebrow")}</p>
        <h1 className="mt-3 text-[clamp(30px,4.5vw,54px)] text-wrap balance">{t("paid.title")}</h1>
        <p className="lead mt-5 max-w-[46ch]">{t("paid.body")}</p>

        <Link
          to="/auth"
          className="mt-9 inline-flex min-h-[52px] items-center border border-primary bg-primary px-8 py-4 text-xs font-semibold uppercase tracking-[0.1em] text-primary-foreground transition-colors hover:bg-transparent hover:text-primary"
        >
          {t("paid.cta")}
        </Link>

        {session && (
          <p className="label-mono mt-10 border-t border-border pt-5">
            {t("paid.reference")} {session.slice(-12)}
          </p>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default PaiementReussi;
