import { Link } from "react-router-dom";
import CarteLueur from "@/components/CarteLueur";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage, Lang } from "@/contexts/LanguageContext";
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
  eyebrow: string; titre: string; chapo: string;
  detailTitre: string;
  versObjets: string; versObjetsLien: string;
  faqTitre: string;
  faqs: { q: string; a: string }[];
}> = {
  fr: {
    eyebrow: "Un prix par événement, pas d'abonnement",
    titre: "Trois façons de garder votre soirée.",
    chapo:
      "Vous payez une seule fois, pour un seul événement. Aucun abonnement, aucune commission sur vos photos. Les albums et les objets imprimés se commandent après, une fois que vous avez vu les photos.",
    detailTitre: "Ce que contient chaque formule",
    versObjets:
      "Les albums, la gazette et les objets imprimés se commandent séparément, après l'événement.",
    versObjetsLien: "Voir les albums et objets",
    faqTitre: "Questions fréquentes",
    faqs: [
      {
        q: "Concrètement, il se passe quoi le jour J ?",
        a: "Vous avez imprimé le panneau d'accueil et les petits chevalets que nous vous fournissons ; ils portent votre QR code. Vos invités dirigent l'appareil photo de leur téléphone dessus, une page s'ouvre, ils envoient leurs photos. Aucune application, aucun compte. Vous, vous ne faites rien : vous regardez la galerie se remplir.",
      },
      {
        q: "Combien de temps mes photos restent-elles en ligne ?",
        a: "Six mois à compter de votre événement, quelle que soit la formule — largement le temps de tout récupérer. Nous vous prévenons par email trente jours avant l'échéance, et le téléchargement de la galerie entière tient en un clic. Vous pouvez aussi la prolonger d'une année pour 29 €, autant de fois que vous le souhaitez. Sans prolongation, tout est supprimé définitivement à l'échéance, sauvegardes comprises : c'est ce que nous devons à vos invités, qui ne nous ont pas confié leurs photos pour que nous les gardions indéfiniment.",
      },
      {
        q: "Y a-t-il une limite au nombre de photos ?",
        a: "Non. Ni au nombre de photos, ni au nombre de vidéos, ni au nombre d'invités. Un mariage de deux cents personnes dépose souvent mille cinq cents photos : c'est compris.",
      },
      {
        q: "Que se passe-t-il si je change d'avis après l'événement ?",
        a: "Vous pouvez passer à une formule supérieure tant que la galerie est en ligne, et vous ne payez que la différence. Les albums et objets imprimés se commandent quand vous voulez, séparément.",
      },
      {
        q: "Y a-t-il des frais cachés ?",
        a: "Non. Le prix affiché est le prix que vous payez, tout compris. Aucune commission sur les photos, aucun frais d'activation. Les seuls coûts en plus sont les objets imprimés, si vous en commandez.",
      },
      {
        q: "Mes invités doivent-ils créer un compte ?",
        a: "Non. Ils scannent le QR code avec leur téléphone et déposent leurs photos, sans installer d'application et sans créer de compte. La recherche par visage leur demande un selfie, mais c'est facultatif : ceux qui ne le font pas déposent leurs photos comme les autres.",
      },
      {
        q: "Le paiement est-il sécurisé ?",
        a: "Oui. Les paiements passent par Stripe, le prestataire qu'utilisent la plupart des sites que vous connaissez. Votre numéro de carte ne transite jamais par nos serveurs et nous ne le voyons jamais.",
      },
    ],
  },
  en: {
    eyebrow: "One price per event, no subscription",
    titre: "Three ways to keep your night.",
    chapo:
      "You pay once, for one event. No subscription, no commission on your photos. Albums and printed objects are ordered afterwards, once you have seen the photos.",
    detailTitre: "What each plan includes",
    versObjets:
      "Albums, the newspaper and printed objects are ordered separately, after the event.",
    versObjetsLien: "See albums and objects",
    faqTitre: "Frequently asked questions",
    faqs: [
      {
        q: "What actually happens on the day?",
        a: "You have printed the welcome sign and the little table cards we give you; they carry your QR code. Your guests point their phone camera at it, a page opens, they send their photos. No app, no account. You do nothing: you watch the gallery fill up.",
      },
      {
        q: "How long do my photos stay online?",
        a: "Six months from your event, whatever the plan — ample time to save everything. We email you thirty days before the deadline, and downloading the whole gallery takes one click. You can extend it by a year for €29, as many times as you like. Without an extension, everything is permanently deleted at the deadline, backups included: that is what we owe your guests, who did not hand us their photos for us to keep forever.",
      },
      {
        q: "Is there a limit on the number of photos?",
        a: "No. No limit on photos, videos or guests. A two-hundred-guest wedding often uploads fifteen hundred photos: that is included.",
      },
      {
        q: "What if I change my mind after the event?",
        a: "You can move up a plan while the gallery is still online, and you only pay the difference. Printed albums and objects are ordered whenever you like, separately.",
      },
      {
        q: "Are there hidden fees?",
        a: "No. The price shown is the price you pay, all in. No commission on photos, no activation fee. The only extra costs are printed objects, if you order any.",
      },
      {
        q: "Do my guests need an account?",
        a: "No. They scan the QR code with their phone and upload their photos, with no app and no account. Face search asks for a selfie, but it is optional: those who skip it upload like everyone else.",
      },
      {
        q: "Is payment secure?",
        a: "Yes. Payments go through Stripe, the provider behind most of the sites you already use. Your card number never passes through our servers and we never see it.",
      },
    ],
  },
};

const Puce = () => (
  <span aria-hidden className="mt-[9px] block h-px w-3 shrink-0 bg-current opacity-45" />
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
                        to={`/creer?formule=${f.id}`}
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

            <div className="mt-[clamp(28px,3.5vw,44px)] flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-7 text-center">
              <p className="max-w-[56ch] text-[15px] leading-relaxed text-foreground">
                {T.versObjets}
              </p>
              <Link
                to="/albums"
                className="label-mono border-b border-foreground pb-0.5 text-foreground opacity-100 transition-opacity hover:opacity-60"
              >
                {T.versObjetsLien}
              </Link>
            </div>
          </div>
        </section>

        {/* Questions — ancre visée par le lien FAQ du pied de page */}
        <section
          id="faq"
          className="scroll-mt-[80px] border-t border-border bg-card py-[clamp(58px,7.5vw,100px)]"
        >
          <div className="mx-auto max-w-[820px] px-[clamp(20px,5vw,48px)]">
            <h2 className="mb-[clamp(28px,3.5vw,44px)] text-center text-[clamp(30px,4.2vw,48px)]">
              {T.faqTitre}
            </h2>
            <div className="border-t border-border">
              {T.faqs.map((f) => (
                <div key={f.q} className="border-b border-border py-7">
                  <h3 className="text-[clamp(19px,1.8vw,23px)] leading-snug">{f.q}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-foreground">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;
