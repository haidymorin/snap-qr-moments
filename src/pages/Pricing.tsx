import { useState } from "react";
import { Link } from "react-router-dom";
import { startCheckout, type PlanId } from "@/lib/checkout";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage, Lang } from "@/contexts/LanguageContext";

type Plan = {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  pitch: string;
  inherits?: string;
  features: string[];
  badge?: string;
  highlighted?: boolean;
  ctaLabel: string;
};

type Extra = { title: string; price: string; description: string };

const data: Record<Lang, {
  plans: Plan[];
  trial: { text: string; link: string };
  extras: Extra[];
  extrasNote: string;
  pro: { name: string; price: string; period: string; pitch: string; features: string[]; ctaLabel: string };
  agency: { name: string; price: string; features: string[]; ctaLabel: string };
  faqs: { q: string; a: string }[];
}> = {
  fr: {
    plans: [
      {
        name: "Essentiel",
        price: "59 €",
        period: "par événement",
        pitch: "Le nécessaire, bien fait. Le QR code, la galerie, et rien qui traîne.",
        features: [
          "QR code et page de collecte, sans application à installer",
          "Galerie partagée, photos et vidéos illimitées",
          "Téléchargement en haute définition par vos invités",
          "Nettoyage automatique : doublons, flous, photos ratées",
          "PDF de signalétique à imprimer : panneau d'accueil et chevalets de table",
          "Hébergement 3 mois",
        ],
        id: "essentiel",
        ctaLabel: "Choisir l'Essentiel",
      },
      {
        name: "Souvenir",
        price: "179 €",
        period: "par événement",
        pitch: "Celui qu'on prend quand on veut vraiment garder quelque chose de la soirée.",
        badge: "Le plus choisi",
        highlighted: true,
        inherits: "Tout l'Essentiel, plus :",
        features: [
          "Livre d'or numérique : messages écrits, vocaux et vidéo",
          "Tri par visage : chaque invité retrouve ses propres photos",
          "Diaporama live projeté pendant la soirée",
          "Page, QR code et signalétique aux couleurs de votre événement",
          "Hébergement 1 an",
        ],
        id: "souvenir",
        ctaLabel: "Choisir le Souvenir",
      },
      {
        name: "Héritage",
        price: "390 €",
        period: "par événement",
        pitch: "Tout le numérique, plus les objets imprimés qui restent après.",
        inherits: "Tout le Souvenir, plus :",
        features: [
          "L'album imprimé grand format, photos et messages en regard",
          "La gazette de votre mariage, 50 exemplaires à distribuer",
          "Hébergement 3 ans",
        ],
        id: "heritage",
        ctaLabel: "Choisir l'Héritage",
      },
    ],
    trial: {
      text: "Vous préférez voir à quoi ça ressemble avant de choisir ?",
      link: "Créez un événement d'essai, 15 photos, sans carte bancaire",
    },
    extras: [
      {
        title: "Album grand format",
        price: "249 €",
        description:
          "Format 30×30 qui s'ouvre à plat, papier épais, couverture toilée. Fabriqué par un imprimeur de photographes.",
      },
      {
        title: "Gazette, 50 exemplaires",
        price: "149 €",
        description:
          "Le journal de votre mariage, quatre pages, à distribuer à vos invités. Vos photos et leurs messages mis en page.",
      },
      {
        title: "Gazette, 100 exemplaires",
        price: "219 €",
        description:
          "La même gazette, en double. Pour les mariages à deux cents personnes ou les familles qui en redemandent.",
      },
      {
        title: "Mini-album personnalisé",
        price: "79 €",
        description:
          "Format carré 20×20, couverture souple, quarante pages. À offrir aux parents ou aux témoins.",
      },
      {
        title: "Kit signalétique imprimé",
        price: "89 €",
        description:
          "Le panneau d'accueil et les douze chevalets de table, imprimés et livrés. Le PDF reste inclus dans tous les paliers.",
      },
      {
        title: "Année d'hébergement supplémentaire",
        price: "29 €",
        description:
          "Pour garder la galerie en ligne un an de plus. À prendre à tout moment, avant l'échéance.",
      },
    ],
    extrasNote: "Tout se commande après l'événement, une fois les photos triées. Rien n'est à décider maintenant.",
    pro: {
      name: "Pro Events",
      price: "149 €",
      period: "par mois",
      pitch: "Pour les photographes, wedding planners et agences qui enchaînent les événements.",
      features: [
        "Événements illimités",
        "Espace à votre nom et à votre logo",
        "Gestion multi-clients et multi-événements",
        "Galeries privées par client",
        "Export haute définition",
        "Statistiques de scans et de dépôts",
        "Support dédié par email",
      ],
      ctaLabel: "Nous contacter",
    },
    agency: {
      name: "Agence et revendeur",
      price: "Sur devis",
      features: [
        "Accès multi-utilisateurs",
        "Intégration à vos outils",
        "Facturation en marque blanche",
        "Interlocuteur dédié",
      ],
      ctaLabel: "Rejoindre la liste d'attente",
    },
    faqs: [
      {
        q: "Combien de temps mes photos restent-elles en ligne ?",
        a: "Cela dépend du palier : trois mois avec l'Essentiel, un an avec le Souvenir, trois ans avec l'Héritage. Passé ce délai, tout est supprimé définitivement de nos serveurs. Vous pouvez prolonger d'une année pour 29 € à tout moment, tant que l'échéance n'est pas passée.",
      },
      {
        q: "Que se passe-t-il si je change d'avis après l'événement ?",
        a: "Vous pouvez passer d'un palier à l'autre tant que la galerie est en ligne. Vous ne payez que la différence. Les objets imprimés se commandent séparément, quand vous voulez, une fois les photos triées.",
      },
      {
        q: "Y a-t-il des frais cachés ?",
        a: "Non. Le prix affiché est le prix que vous payez, tout compris. Aucune commission sur les photos, aucun frais d'activation. Les seuls coûts en plus sont les objets imprimés, si vous en commandez.",
      },
      {
        q: "Mes invités doivent-ils créer un compte ?",
        a: "Non. Ils scannent le QR code avec leur téléphone et déposent leurs photos, sans installer d'application et sans créer de compte. Le tri par visage leur demande un selfie, mais c'est facultatif : ceux qui ne le font pas ne sont simplement pas identifiés.",
      },
      {
        q: "Le paiement est-il sécurisé ?",
        a: "Oui. Les paiements passent par Stripe. Vos coordonnées bancaires ne transitent jamais par nos serveurs.",
      },
    ],
  },
  en: {
    plans: [
      {
        name: "Essential",
        price: "€59",
        period: "per event",
        pitch: "What you need, done properly. The QR code, the gallery, nothing left lying around.",
        features: [
          "QR code and collection page, no app to install",
          "Shared gallery, unlimited photos and videos",
          "Full-resolution downloads for your guests",
          "Automatic clean-up: duplicates, blurry shots, misfires",
          "Printable signage PDF: welcome sign and table cards",
          "3 months hosting",
        ],
        id: "essentiel",
        ctaLabel: "Choose Essential",
      },
      {
        name: "Keepsake",
        price: "€179",
        period: "per event",
        pitch: "The one you pick when you actually want to keep something from the night.",
        badge: "Most chosen",
        highlighted: true,
        inherits: "Everything in Essential, plus:",
        features: [
          "Digital guest book: written, voice and video messages",
          "Face sorting: every guest finds their own photos",
          "Live slideshow projected during the party",
          "Page, QR code and signage in your event's colours",
          "1 year hosting",
        ],
        id: "souvenir",
        ctaLabel: "Choose Keepsake",
      },
      {
        name: "Heirloom",
        price: "€390",
        period: "per event",
        pitch: "Everything digital, plus the printed objects that outlast it.",
        inherits: "Everything in Keepsake, plus:",
        features: [
          "The large-format printed album, photos and messages side by side",
          "Your wedding newspaper, 50 copies to hand out",
          "3 years hosting",
        ],
        id: "heritage",
        ctaLabel: "Choose Heirloom",
      },
    ],
    trial: {
      text: "Rather see what it looks like before you pick?",
      link: "Create a trial event, 15 photos, no card required",
    },
    extras: [
      {
        title: "Large-format album",
        price: "€249",
        description:
          "30×30 lay-flat format, heavy paper, cloth cover. Made by a printer who works for photographers.",
      },
      {
        title: "Newspaper, 50 copies",
        price: "€149",
        description:
          "Your wedding paper, four pages, to hand out to your guests. Your photos and their messages, laid out.",
      },
      {
        title: "Newspaper, 100 copies",
        price: "€219",
        description:
          "The same paper, twice over. For two-hundred-guest weddings, or families who keep asking.",
      },
      {
        title: "Personalised mini album",
        price: "€79",
        description:
          "20×20 square format, soft cover, forty pages. One for the parents, one for the witnesses.",
      },
      {
        title: "Printed signage kit",
        price: "€89",
        description:
          "The welcome sign and twelve table cards, printed and delivered. The PDF stays included in every plan.",
      },
      {
        title: "Extra year of hosting",
        price: "€29",
        description:
          "To keep the gallery online another year. Add it any time, before the deadline passes.",
      },
    ],
    extrasNote: "Everything is ordered after the event, once the photos are sorted. Nothing to decide now.",
    pro: {
      name: "Pro Events",
      price: "€149",
      period: "per month",
      pitch: "For photographers, wedding planners and agencies running events back to back.",
      features: [
        "Unlimited events",
        "Workspace under your name and logo",
        "Multi-client and multi-event management",
        "Private gallery per client",
        "Full-resolution export",
        "Scan and upload statistics",
        "Dedicated email support",
      ],
      ctaLabel: "Get in touch",
    },
    agency: {
      name: "Agency and reseller",
      price: "On request",
      features: [
        "Multi-user access",
        "Integration with your tools",
        "White-label invoicing",
        "A dedicated contact",
      ],
      ctaLabel: "Join the waiting list",
    },
    faqs: [
      {
        q: "How long do my photos stay online?",
        a: "It depends on the plan: three months on Essential, one year on Keepsake, three years on Heirloom. After that, everything is permanently deleted from our servers. You can extend by a year for €29 at any point, as long as the deadline hasn't passed.",
      },
      {
        q: "What if I change my mind after the event?",
        a: "You can move up a plan while the gallery is still online, and you only pay the difference. Printed objects are ordered separately, whenever you like, once the photos are sorted.",
      },
      {
        q: "Are there hidden fees?",
        a: "No. The price shown is the price you pay, all in. No commission on photos, no activation fee. The only extra costs are printed objects, if you order any.",
      },
      {
        q: "Do my guests need an account?",
        a: "No. They scan the QR code with their phone and upload their photos, with no app and no account. Face sorting asks them for a selfie, but it's optional: those who skip it simply aren't identified.",
      },
      {
        q: "Is payment secure?",
        a: "Yes. Payments go through Stripe. Your card details never pass through our servers.",
      },
    ],
  },
};

const Check = () => (
  <span aria-hidden className="mt-[9px] block h-px w-3 shrink-0 bg-current opacity-45" />
);

const Pricing = () => {
  const { t, lang } = useLanguage();
  const [tab, setTab] = useState<"particuliers" | "professionnels">("particuliers");
  const [pending, setPending] = useState<PlanId | null>(null);
  const { toast } = useToast();

  /* Le bouton d'un palier envoie vers la page de paiement Stripe. */
  const choose = async (plan: PlanId) => {
    if (pending) return;
    setPending(plan);
    try {
      await startCheckout(plan);
    } catch (err) {
      setPending(null);
      toast({
        title: "Le paiement n'a pas pu s'ouvrir",
        description: String((err as Error).message ?? err),
        variant: "destructive",
      });
    }
  };
  const { plans, trial, extras, extrasNote, pro, agency, faqs } = data[lang];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 pt-[72px]">
        {/* Titre */}
        <section className="pb-[clamp(28px,3.5vw,44px)] pt-[clamp(48px,6vw,84px)]">
          <div className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,48px)] text-center">
            <p className="eyebrow">{t("pricing.eyebrow")}</p>
            <h1 className="mx-auto mt-3 max-w-[18ch] text-[clamp(38px,6vw,72px)]">
              {t("pricing.title")}
            </h1>
            <p className="mx-auto mt-5 max-w-[52ch] leading-relaxed text-foreground">
              {t("pricing.subtitle")}
            </p>
          </div>
        </section>

        {/* Bascule particuliers / professionnels */}
        <section className="pb-[clamp(30px,4vw,48px)]">
          <div className="mx-auto flex max-w-[1180px] justify-center gap-8 px-[clamp(20px,5vw,48px)]">
            {(["particuliers", "professionnels"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                aria-pressed={tab === key}
                className={`label-mono min-h-[44px] border-b pb-2 transition-colors ${
                  tab === key
                    ? "border-foreground text-foreground opacity-100"
                    : "border-transparent hover:text-foreground"
                }`}
              >
                {key === "particuliers" ? t("pricing.tabIndiv") : t("pricing.tabPro")}
              </button>
            ))}
          </div>
        </section>

        {/* Les paliers */}
        <section className="pb-[clamp(46px,6vw,80px)]">
          <div className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,48px)]">
            {tab === "particuliers" ? (
              <>
                <div className="grid gap-[clamp(14px,1.8vw,22px)] lg:grid-cols-3">
                  {plans.map((plan) => {
                    const dark = plan.highlighted;
                    return (
                      <article
                        key={plan.name}
                        className={`flex flex-col border p-[clamp(24px,2.6vw,34px)] ${
                          dark
                            ? "border-night bg-night text-night-foreground"
                            : "border-border bg-card text-foreground"
                        }`}
                      >
                        <div className="flex min-h-[26px] items-start justify-between gap-3">
                          <h2 className="text-[clamp(26px,2.6vw,34px)] leading-none">{plan.name}</h2>
                          {plan.badge && (
                            <span
                              className={`label-mono shrink-0 border px-2 py-1 opacity-100 ${
                                dark ? "border-night-border text-night-foreground" : "border-border text-foreground"
                              }`}
                            >
                              {plan.badge}
                            </span>
                          )}
                        </div>

                        <div className="mt-5 flex items-baseline gap-2">
                          <span className="font-display text-[clamp(42px,4.6vw,58px)] leading-none">
                            {plan.price}
                          </span>
                          <span className="text-[13px]">
                            {plan.period}
                          </span>
                        </div>

                        <p className="mt-4 text-[15px] leading-relaxed">
                          {plan.pitch}
                        </p>

                        <div className={`mt-6 flex-1 border-t pt-6 ${dark ? "border-night-border" : "border-border"}`}>
                          {plan.inherits && (
                            <p className="mb-4 text-[14px] font-semibold">{plan.inherits}</p>
                          )}
                          <ul className="space-y-3">
                            {plan.features.map((f) => (
                              <li key={f} className="flex gap-3 text-[14.5px] leading-relaxed">
                                <Check />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <button
                          type="button"
                          onClick={() => choose(plan.id)}
                          disabled={pending !== null}
                          className={`mt-8 inline-flex min-h-[48px] items-center justify-center border px-6 py-4 text-xs font-semibold uppercase tracking-[0.1em] transition-colors disabled:opacity-60 ${
                            dark
                              ? "border-night-foreground bg-night-foreground text-night hover:bg-transparent hover:text-night-foreground"
                              : "border-primary bg-primary text-primary-foreground hover:bg-transparent hover:text-primary"
                          }`}
                        >
                          {pending === plan.id ? "Redirection…" : plan.ctaLabel}
                        </button>
                      </article>
                    );
                  })}
                </div>

                {/* L'essai gratuit, discret, sous les vraies offres */}
                <p className="mt-8 text-center text-[14.5px] text-foreground">
                  {trial.text}{" "}
                  <Link
                    to="/auth"
                    className="border-b border-foreground pb-0.5 text-foreground opacity-100 transition-opacity hover:opacity-60"
                  >
                    {trial.link}
                  </Link>
                </p>
              </>
            ) : (
              <div className="grid gap-[clamp(14px,1.8vw,22px)] lg:grid-cols-[1.55fr_1fr]">
                <article className="flex flex-col border border-night bg-night p-[clamp(24px,2.6vw,34px)] text-night-foreground">
                  <h2 className="text-[clamp(26px,2.6vw,34px)] leading-none">{pro.name}</h2>
                  <div className="mt-5 flex items-baseline gap-2">
                    <span className="font-display text-[clamp(42px,4.6vw,58px)] leading-none">{pro.price}</span>
                    <span className="text-[13px]">{pro.period}</span>
                  </div>
                  <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed">{pro.pitch}</p>
                  <ul className="mt-6 grid gap-3 border-t border-night-border pt-6 sm:grid-cols-2">
                    {pro.features.map((f) => (
                      <li key={f} className="flex gap-3 text-[14.5px] leading-relaxed">
                        <Check />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/contact"
                    className="mt-8 inline-flex min-h-[48px] items-center justify-center border border-night-foreground bg-night-foreground px-6 py-4 text-xs font-semibold uppercase tracking-[0.1em] text-night transition-colors hover:bg-transparent hover:text-night-foreground"
                  >
                    {pro.ctaLabel}
                  </Link>
                </article>

                <article className="flex flex-col border border-border bg-card p-[clamp(24px,2.6vw,34px)]">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-[clamp(24px,2.3vw,30px)] leading-none">{agency.name}</h2>
                    <span className="label-mono shrink-0 border border-border px-2 py-1 text-foreground opacity-100">
                      {t("pricing.soon")}
                    </span>
                  </div>
                  <p className="mt-5 font-display text-[clamp(30px,3vw,38px)] leading-none">{agency.price}</p>
                  <ul className="mt-6 space-y-3 border-t border-border pt-6">
                    {agency.features.map((f) => (
                      <li key={f} className="flex gap-3 text-[14.5px] leading-relaxed">
                        <Check />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/contact"
                    className="mt-auto inline-flex min-h-[48px] items-center justify-center border border-border px-6 py-4 pt-4 text-xs font-semibold uppercase tracking-[0.1em] text-foreground transition-colors hover:border-primary"
                    style={{ marginTop: "2rem" }}
                  >
                    {agency.ctaLabel}
                  </Link>
                </article>
              </div>
            )}
          </div>
        </section>

        {/* Les objets, à commander après */}
        <section className="border-t border-border bg-card py-[clamp(58px,7.5vw,100px)]">
          <div className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,48px)]">
            <div className="mx-auto mb-[clamp(30px,4vw,48px)] max-w-2xl text-center">
              <p className="eyebrow">{t("pricing.extrasEyebrow")}</p>
              <h2 className="mt-3 text-[clamp(32px,4.6vw,54px)]">{t("pricing.extrasTitle")}</h2>
              <p className="mx-auto mt-4 max-w-[52ch] leading-relaxed text-foreground">
                {extrasNote}
              </p>
            </div>

            <div className="grid border-t border-border sm:grid-cols-2 lg:grid-cols-3">
              {extras.map((opt) => (
                <div
                  key={opt.title}
                  className="border-b border-border px-6 pb-8 pt-7 sm:border-r sm:[&:nth-child(2n)]:border-r-0 lg:[&:nth-child(2n)]:border-r lg:[&:nth-child(3n)]:border-r-0"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="text-[clamp(20px,1.9vw,25px)] leading-tight">{opt.title}</h3>
                    <span className="shrink-0 font-display text-[clamp(21px,2vw,26px)] leading-none">
                      {opt.price}
                    </span>
                  </div>
                  <p className="mt-3 text-[14.5px] leading-relaxed text-foreground">
                    {opt.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Questions */}
        <section className="py-[clamp(58px,7.5vw,100px)]">
          <div className="mx-auto max-w-[820px] px-[clamp(20px,5vw,48px)]">
            <h2 className="mb-[clamp(28px,3.5vw,44px)] text-center text-[clamp(30px,4.2vw,48px)]">
              {t("pricing.faqTitle")}
            </h2>
            <div className="border-t border-border">
              {faqs.map((f) => (
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
