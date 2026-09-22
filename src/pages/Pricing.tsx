import { Link } from "react-router-dom";
import CarteLueur from "@/components/CarteLueur";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage, Lang } from "@/contexts/LanguageContext";
import { lienAchat, VENTE_OUVERTE } from "@/lib/vente";
import { FORMULES } from "@/data/formules";

/* La page des tarifs.
 *
 * L'offre professionnelle a été retirée : elle n'existe pas encore. Afficher
 * « Pro Events, 149 € par mois » avec sept fonctionnalités qu'on ne sait pas
 * livrer, c'est promettre à un photographe un produit qu'il ne recevra pas.
 * Elle reviendra quand elle sera construite.
 *
 * Les objets imprimés ont leur propre onglet : ils étaient en bas de cette
 * page, là où personne ne descend.
 */

const TEXTES: Record<Lang, {
  eyebrow: string; titre: string; chapo: string; avis: string;
  detailTitre: string;
  versObjets: string; versObjetsLien: string;
  faqRenvoi: string; faqRenvoiLien: string;
}> = {
  fr: {
    eyebrow: "Un prix par événement",
    titre: "Trois façons de garder votre soirée.",
    chapo:
      "Vous payez une seule fois, pour votre événement. Les albums et les objets imprimés se commandent après, une fois que vous avez vu les photos.",
    avis:
      "Les commandes ouvrent dans quelques jours. En attendant, réservez votre date : rien à payer, et le tarif affiché ici vous reste acquis.",
    detailTitre: "Ce que contient chaque formule",
    versObjets:
      "Les albums, la gazette et les objets imprimés se commandent séparément, après l'événement.",
    versObjetsLien: "Voir les albums et objets",
    faqRenvoi: "Toutes les questions fréquentes sont sur la page d'accueil.",
    faqRenvoiLien: "Les voir",
  },
  en: {
    eyebrow: "One price per event",
    titre: "Three ways to keep your night.",
    chapo:
      "You pay once, for your event. Albums and printed objects are ordered afterwards, once you have seen the photos.",
    avis:
      "Orders open in a few days. In the meantime, save your date: nothing to pay, and the price shown here stays yours.",
    detailTitre: "What each plan includes",
    versObjets:
      "Albums, the newspaper and printed objects are ordered separately, after the event.",
    versObjetsLien: "See albums and objects",
    faqRenvoi: "All frequently asked questions are on the home page.",
    faqRenvoiLien: "See them",
  },
};

const Puce = () => (
  <span aria-hidden className="mt-[7px] block size-[7px] shrink-0 rounded-full bg-primary" />
);

const Pricing = () => {
  const { lang } = useLanguage();
  const T = TEXTES[lang];
  const formules = FORMULES[lang];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 pt-[72px]">
        <section className="pb-[clamp(28px,3.5vw,44px)] pt-[clamp(48px,6vw,84px)]">
          <div className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,48px)] text-center">
            <p className="eyebrow">{T.eyebrow}</p>
            <h1 className="mx-auto mt-3 max-w-[18ch] text-[clamp(38px,6vw,72px)]">{T.titre}</h1>
            <p className="mx-auto mt-5 max-w-[58ch] leading-relaxed text-foreground">{T.chapo}</p>
            {/* Pas de prix barré, pas de compte à rebours : l'information
                suffit. Ce qui est promis ici est tenable sans rien faire. */}
            {!VENTE_OUVERTE && (
              <p className="mx-auto mt-6 max-w-[58ch] rounded-2xl border border-accent bg-card px-5 py-4 text-[14px] leading-relaxed text-muted-foreground">
                {T.avis}
              </p>
            )}
          </div>
        </section>

        {/* Les trois formules, avec le détail de chaque ligne */}
        <section className="pb-[clamp(46px,6vw,80px)] pt-[clamp(18px,2.5vw,32px)]">
          <div className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,48px)]">
            <div className="grid items-start gap-[clamp(14px,1.8vw,22px)] lg:grid-cols-3">
              {formules.map((f) => {
                const sombre = f.vedette;
                return (
                  <CarteLueur key={f.id} className="h-full scroll-mt-[100px]" id={f.id}>
                    <article
                      className={`flex h-full flex-col rounded-2xl border p-[clamp(24px,2.6vw,34px)] ${
                        sombre
                          ? "border-night bg-night text-night-foreground"
                          : "border-border bg-card text-foreground"
                      }`}
                    >
                      <div className="flex min-h-[26px] items-start justify-between gap-3">
                        <h2 className="text-[clamp(26px,2.6vw,34px)] leading-none">{f.nom}</h2>
                        {f.badge && (
                          <span
                            className={`label-mono shrink-0 rounded-full border px-2.5 py-1 opacity-100 ${
                              sombre
                                ? "border-night-border text-night-foreground"
                                : "border-border text-foreground"
                            }`}
                          >
                            {f.badge}
                          </span>
                        )}
                      </div>

                      <div className="mt-5 flex items-baseline gap-2">
                        <span className="font-display text-[clamp(42px,4.6vw,58px)] leading-none">
                          {f.prix}
                        </span>
                        <span className="text-[13px]">{f.periode}</span>
                      </div>

                      <p className="mt-4 text-[15px] leading-relaxed">{f.pitch}</p>

                      <div
                        className={`mt-6 flex-1 border-t pt-6 ${
                          sombre ? "border-night-border" : "border-border"
                        }`}
                      >
                        {f.herite && (
                          <p className="mb-4 text-[14px] font-semibold">{f.herite}</p>
                        )}
                        <ul className="space-y-3">
                          {f.points.map((p) => (
                            <li key={p} className="flex gap-3 text-[14.5px] leading-relaxed">
                              <Puce />
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <Link
                        to={lienAchat(f.id)}
                        className={`mt-8 inline-flex min-h-[48px] items-center justify-center rounded-full border px-6 py-4 text-xs font-semibold uppercase tracking-[0.1em] transition-colors ${
                          sombre
                            ? "border-night-foreground bg-night-foreground text-night hover:bg-transparent hover:text-night-foreground"
                            : "border-primary bg-primary text-primary-foreground hover:bg-transparent hover:text-primary"
                        }`}
                      >
                        {f.cta}
                      </Link>
                    </article>
                  </CarteLueur>
                );
              })}
            </div>


            <div className="mt-[clamp(20px,2.6vw,32px)] flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-7 text-center">
              <p className="max-w-[56ch] text-[15px] leading-relaxed text-foreground">
                {T.versObjets}
              </p>
              <Link
                to="/demo"
                className="label-mono border-b border-foreground pb-0.5 text-foreground opacity-100 transition-opacity hover:opacity-60"
              >
                {lang === "fr" ? "Voir une galerie de démonstration" : "See a demo gallery"}
              </Link>
              <Link
                to="/albums"
                className="label-mono border-b border-foreground pb-0.5 text-foreground opacity-100 transition-opacity hover:opacity-60"
              >
                {T.versObjetsLien}
              </Link>
            </div>
          </div>
        </section>

        {/* Les questions fréquentes sont désormais sur l'accueil, là où l'on
            se demande encore si le service fait ce qu'il promet. Reste ici un
            renvoi discret, pour qui arriverait directement sur les tarifs. */}
        <section className="border-t border-border bg-card py-[clamp(30px,4vw,48px)]">
          <div className="mx-auto max-w-[820px] px-[clamp(20px,5vw,48px)] text-center">
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              {T.faqRenvoi}{" "}
              <Link
                to="/#faq"
                className="border-b border-foreground pb-0.5 text-foreground transition-opacity hover:opacity-60"
              >
                {T.faqRenvoiLien}
              </Link>
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;
