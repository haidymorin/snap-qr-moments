import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PricingCard from "@/components/PricingCard";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useLanguage, Lang } from "@/contexts/LanguageContext";

type Plan = {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  badge?: string;
  highlighted?: boolean;
  ctaLabel: string;
  ctaTo: string;
};

const data: Record<Lang, {
  individualPlans: Plan[];
  proPlan: Plan;
  agency: { features: string[] };
  addOns: { title: string; price: string; description: string }[];
  faqs: { q: string; a: string }[];
}> = {
  fr: {
    individualPlans: [
      {
        name: "Free Test",
        price: "Gratuit",
        description: "Pour découvrir le service",
        features: [
          "1 événement test",
          "15 photos maximum",
          "QR Code unique généré automatiquement",
          "Galerie partagée en temps réel",
          "Téléchargement ZIP",
          "Support par email",
        ],
        ctaLabel: "Commencer gratuitement",
        ctaTo: "/auth",
      },
      {
        name: "Classique",
        price: "39€",
        period: "événement",
        description: "Idéal pour anniversaires et soirées",
        badge: "Populaire",
        highlighted: true,
        features: [
          "Photos illimitées",
          "QR Code premium personnalisé avec nom de l'événement",
          "Galerie haute qualité",
          "Téléchargement ZIP de toutes les photos",
          "Partage du lien galerie avec tous les invités",
          "Conservation 60 jours",
          "Support prioritaire",
        ],
        ctaLabel: "Créer mon événement",
        ctaTo: "/auth",
      },
      {
        name: "Premium IA",
        price: "149€",
        period: "événement",
        description: "Idéal pour mariages et événements importants",
        features: [
          "Tout du Classique, plus :",
          "Tri intelligent des photos par IA (bientôt disponible)",
          "Albums personnalisés par invité via selfie de référence (bientôt disponible)",
          "Diaporama automatique (bientôt disponible)",
          "Supports physiques QR Code inclus",
          "Conservation 60 jours",
          "Support 24/7",
        ],
        ctaLabel: "Créer mon événement premium",
        ctaTo: "/auth",
      },
    ],
    proPlan: {
      name: "Pro Events",
      price: "149€",
      period: "mois",
      description: "Pour photographes, wedding planners et agences événementielles",
      badge: "Recommandé",
      highlighted: true,
      features: [
        "Événements illimités",
        "Photos illimitées",
        "Espace brandé à votre nom et logo",
        "Gestion multi-clients et multi-événements",
        "Galeries privées par client",
        "Export haute qualité",
        "Analytics de base (nombre de scans, uploads)",
        "Support dédié par email",
      ],
      ctaLabel: "Nous contacter pour démarrer",
      ctaTo: "/contact",
    },
    agency: {
      features: [
        "Accès multi-utilisateurs",
        "Intégration à vos outils",
        "Facturation en marque blanche",
        "Compte manager dédié",
      ],
    },
    addOns: [
      {
        title: "Supports physiques QR Code",
        price: "Inclus",
        description:
          "Carton de table, chevalet ou affiche d'entrée. Fichiers PDF haute résolution fournis, personnalisés avec le nom et la date de votre événement.",
      },
      {
        title: "Album digital PDF",
        price: "14€",
        description:
          "Sélectionnez vos meilleures photos et recevez un album PDF élégant et partageable. Idéal pour envoyer un souvenir à vos proches.",
      },
      {
        title: "Album photo imprimé",
        price: "à partir de 99€",
        description:
          "Un vrai album photo livré à votre domicile, fabriqué par des imprimeurs professionnels. Format personnalisable, qualité premium.",
      },
      {
        title: "Stockage longue durée",
        price: "39€ / an",
        description:
          "Prolongez la conservation de vos photos de 60 jours à 2 ans. Accès permanent à votre galerie, téléchargement à tout moment.",
      },
    ],
    faqs: [
      {
        q: "Combien de temps mes photos sont-elles conservées ?",
        a: "Vos photos sont conservées pendant 60 jours après la date de votre événement pour toutes les offres, y compris le Pro. Passé ce délai, elles sont supprimées définitivement de nos serveurs. Si vous souhaitez un accès prolongé, l'option Stockage longue durée vous permet de conserver vos galeries jusqu'à 2 ans, pour 9,99€ par mois.",
      },
      {
        q: "Puis-je changer de formule après mon achat ?",
        a: "Pour les offres à l'événement (Classique et Premium IA), chaque achat est lié à un événement précis. Vous pouvez créer un nouvel événement avec une offre différente à tout moment. Pour l'abonnement Pro, vous pouvez résilier à la fin de chaque mois, sans engagement ni frais de résiliation.",
      },
      {
        q: "Y a-t-il des frais cachés ?",
        a: "Non. Le prix affiché est le prix que vous payez, tout compris. Aucune commission sur les photos, aucun frais d'activation, aucune surprise. Les seuls coûts supplémentaires possibles sont les options à la carte que vous choisissez vous-même.",
      },
      {
        q: "Le paiement est-il sécurisé ?",
        a: "Oui. Les paiements sont traités via Stripe, référence mondiale de la sécurité des paiements en ligne. Vos coordonnées bancaires ne transitent jamais par nos serveurs et sont chiffrées de bout en bout.",
      },
      {
        q: "Mes invités doivent-ils créer un compte pour partager leurs photos ?",
        a: "Non. Vos invités scannent simplement le QR Code avec leur téléphone et déposent leurs photos directement, sans télécharger d'application et sans créer de compte.",
      },
    ],
  },
  en: {
    individualPlans: [
      {
        name: "Free Trial",
        price: "Free",
        description: "Discover the service",
        features: [
          "1 trial event",
          "15 photos maximum",
          "Unique auto-generated QR Code",
          "Real-time shared gallery",
          "ZIP download",
          "Email support",
        ],
        ctaLabel: "Start for free",
        ctaTo: "/auth",
      },
      {
        name: "Classic",
        price: "€39",
        period: "event",
        description: "Perfect for birthdays and parties",
        badge: "Popular",
        highlighted: true,
        features: [
          "Unlimited photos",
          "Premium QR Code with custom event name",
          "High-resolution gallery",
          "ZIP download of every photo",
          "Shareable gallery link for all guests",
          "60-day retention",
          "Priority support",
        ],
        ctaLabel: "Create my event",
        ctaTo: "/auth",
      },
      {
        name: "Premium AI",
        price: "€149",
        period: "event",
        description: "Ideal for weddings and milestone events",
        features: [
          "Everything in Classic, plus:",
          "AI-powered smart photo sorting (coming soon)",
          "Personalized albums per guest via reference selfie (coming soon)",
          "Automatic slideshow (coming soon)",
          "Physical QR Code displays included",
          "60-day retention",
          "24/7 support",
        ],
        ctaLabel: "Create my premium event",
        ctaTo: "/auth",
      },
    ],
    proPlan: {
      name: "Pro Events",
      price: "€149",
      period: "month",
      description: "For photographers, wedding planners and event agencies",
      badge: "Recommended",
      highlighted: true,
      features: [
        "Unlimited events",
        "Unlimited photos",
        "Workspace branded with your name and logo",
        "Multi-client and multi-event management",
        "Private gallery per client",
        "High-quality export",
        "Basic analytics (scans, uploads)",
        "Dedicated email support",
      ],
      ctaLabel: "Contact us to get started",
      ctaTo: "/contact",
    },
    agency: {
      features: [
        "Multi-user access",
        "Integration with your tools",
        "White-label invoicing",
        "Dedicated account manager",
      ],
    },
    addOns: [
      {
        title: "Physical QR Code displays",
        price: "Included",
        description:
          "Table card, easel sign or entry poster. High-resolution PDF files included, customized with your event name and date.",
      },
      {
        title: "Digital PDF album",
        price: "€14",
        description:
          "Select your best photos and receive an elegant, shareable PDF album. Perfect to send a keepsake to friends and family.",
      },
      {
        title: "Printed photo album",
        price: "from €99",
        description:
          "A real photo album delivered to your door, crafted by professional printers. Customizable format, premium quality.",
      },
      {
        title: "Long-term storage",
        price: "€39 / year",
        description:
          "Extend photo retention from 60 days to 2 years. Permanent gallery access, download anytime.",
      },
    ],
    faqs: [
      {
        q: "How long are my photos kept?",
        a: "Your photos are kept for 60 days after your event date across every plan, including Pro. After that, they are permanently deleted from our servers. If you need longer access, the Long-term storage option keeps your galleries available for up to 2 years at €9.99 per month.",
      },
      {
        q: "Can I change plans after purchase?",
        a: "For per-event plans (Classic and Premium AI), each purchase is tied to a specific event. You can create a new event under a different plan at any time. For the Pro subscription, you can cancel at the end of each month, with no commitment or cancellation fees.",
      },
      {
        q: "Are there any hidden fees?",
        a: "No. The price shown is the price you pay, all inclusive. No commission on photos, no activation fees, no surprises. The only possible extra costs are the optional add-ons you choose yourself.",
      },
      {
        q: "Is payment secure?",
        a: "Yes. Payments are processed via Stripe, a global leader in online payment security. Your banking details never transit our servers and are encrypted end-to-end.",
      },
      {
        q: "Do my guests need to create an account to share photos?",
        a: "No. Your guests simply scan the QR Code with their phone and upload their photos directly — no app download, no account creation.",
      },
    ],
  },
};

const Pricing = () => {
  const { t, lang } = useLanguage();
  const [tab, setTab] = useState<"particuliers" | "professionnels">("particuliers");
  const { individualPlans, proPlan, agency, addOns, faqs } = data[lang];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <section className="pt-24 pb-12 px-4">
          <div className="container mx-auto text-center max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{t("pricing.title")}</h1>
            <p className="text-lg md:text-xl text-muted-foreground">{t("pricing.subtitle")}</p>
          </div>
        </section>

        <section className="px-4 pb-8">
          <div className="container mx-auto flex justify-center">
            <div className="inline-flex p-1 rounded-full bg-muted border border-border shadow-soft">
              <button
                onClick={() => setTab("particuliers")}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
                  tab === "particuliers"
                    ? "bg-gradient-hero text-white shadow-card"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("pricing.tabIndiv")}
              </button>
              <button
                onClick={() => setTab("professionnels")}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
                  tab === "professionnels"
                    ? "bg-gradient-hero text-white shadow-card"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("pricing.tabPro")}
              </button>
            </div>
          </div>
        </section>

        <section className="px-4 pb-20">
          <div className="container mx-auto max-w-6xl">
            {tab === "particuliers" ? (
              <div className="grid md:grid-cols-3 gap-8 items-stretch pt-6">
                {individualPlans.map((plan) => (
                  <PricingCard key={plan.name} {...plan} />
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-8 items-stretch pt-6 max-w-5xl mx-auto">
                <div className="md:col-span-2">
                  <PricingCard {...proPlan} />
                </div>
                <div className="relative p-8 rounded-2xl border border-dashed border-border bg-muted/40 shadow-soft flex flex-col text-center">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-secondary text-secondary-foreground px-4 py-1 rounded-full text-sm font-semibold shadow-soft">
                    {t("pricing.soon")}
                  </div>
                  <div className="mb-6 mt-2">
                    <h3 className="text-2xl font-bold mb-2">{t("pricing.agencyTitle")}</h3>
                    <p className="text-muted-foreground text-sm mb-4">{t("pricing.agencyPrice")}</p>
                  </div>
                  <ul className="space-y-3 mb-8 text-sm text-left">
                    {agency.features.map((f) => (
                      <li key={f}>• {f}</li>
                    ))}
                  </ul>
                  <Button asChild variant="outline" size="lg" className="w-full mt-auto">
                    <Link to="/contact">{t("pricing.agencyCta")}</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="px-4 py-20 bg-muted/30">
          <div className="container mx-auto max-w-6xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">{t("pricing.addonsTitle")}</h2>
            <p className="text-muted-foreground text-lg mb-12">{t("pricing.addonsSubtitle")}</p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {addOns.map((opt) => (
                <div
                  key={opt.title}
                  className="p-6 rounded-2xl bg-card border border-border shadow-soft hover:shadow-card transition-all text-center flex flex-col"
                >
                  <Sparkles className="h-6 w-6 text-primary mx-auto mb-3" />
                  <h3 className="font-bold text-lg mb-2">{opt.title}</h3>
                  <p className="text-primary font-semibold mb-3">{opt.price}</p>
                  <p className="text-sm text-muted-foreground">{opt.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-20">
          <div className="container mx-auto max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">{t("pricing.faqTitle")}</h2>
            <div className="space-y-6">
              {faqs.map((f) => (
                <div key={f.q} className="p-6 rounded-2xl bg-card border border-border shadow-soft">
                  <h3 className="font-semibold text-lg mb-2">{f.q}</h3>
                  <p className="text-muted-foreground leading-relaxed">{f.a}</p>
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
