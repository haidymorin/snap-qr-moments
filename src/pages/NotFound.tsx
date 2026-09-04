import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";

/* Le gabarit d'origine était en anglais, sur fond gris, avec un lien bleu
   souligné : trois manquements à la charte sur un site français. */
const NotFound = () => {
  const location = useLocation();
  const { t } = useLanguage();

  useEffect(() => {
    console.error("404 — route inexistante :", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 items-center pt-[72px]">
        <div className="mx-auto w-full max-w-[760px] px-[clamp(20px,5vw,48px)] py-[clamp(56px,8vw,110px)]">
          <p className="label-mono text-muted-foreground">404</p>
          <h1 className="mt-4 text-[clamp(34px,5.4vw,64px)] text-wrap balance">
            {t("notFound.title")}
          </h1>
          <p className="mt-6 max-w-[52ch] text-[clamp(16px,1.7vw,18px)] leading-relaxed text-muted-foreground">
            {t("notFound.desc")}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              to="/"
              className="inline-flex min-h-[48px] items-center rounded-full border border-primary bg-primary px-7 py-4 text-xs font-semibold uppercase tracking-[0.1em] text-primary-foreground transition-colors hover:bg-transparent hover:text-primary"
            >
              {t("notFound.home")}
            </Link>
            <Link
              to="/pricing"
              className="inline-flex min-h-[48px] items-center rounded-xl border border-border px-7 py-4 text-xs font-semibold uppercase tracking-[0.1em] text-foreground transition-colors hover:border-primary"
            >
              {t("notFound.pricing")}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
