import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PricingCard from "@/components/PricingCard";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

const individualPlans = [
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
    price: "79€",
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
];

const addOns = [
  {
    title: "Supports physiques QR Code",
    price: "à partir de 9€",
    description:
      "Carton de table, chevalet ou affiche d'entrée. Fichiers PDF haute résolution fournis, personnalisés avec le nom et la date de votre événement. Prêts à imprimer chez vous ou en imprimerie.",
  },
  {
    title: "Album digital PDF",
    price: "14€",
    description:
      "Sélectionnez vos meilleures photos et recevez un album PDF élégant et partageable. Idéal pour envoyer un souvenir à vos proches.",
  },
  {
    title: "Album photo imprimé",
    price: "à partir de 29€",
    description:
      "Un vrai album photo livré à votre domicile, fabriqué par des imprimeurs professionnels. Format personnalisable, qualité premium.",
  },
  {
    title: "Stockage longue durée",
    price: "9,99€ /mois",
    description:
      "Prolongez la conservation de vos photos de 60 jours à 2 ans. Accès permanent à votre galerie, téléchargement à tout moment.",
  },
];

const faqs = [
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
    a: "Non. Vos invités scannent simplement le QR Code avec leur téléphone et déposent leurs photos directement, sans télécharger d'application et sans créer de compte. C'est l'un des principes fondamentaux de QR Memories : zéro friction pour les invités.",
  },
];

const Pricing = () => {
  const [tab, setTab] = useState<"particuliers" | "professionnels">("particuliers");

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="pt-24 pb-12 px-4">
          <div className="container mx-auto text-center max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Des tarifs simples et transparents
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              Commencez gratuitement. Upgradez quand vous en avez besoin.
            </p>
          </div>
        </section>

        {/* Tabs */}
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
                Particuliers
              </button>
              <button
                onClick={() => setTab("professionnels")}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
                  tab === "professionnels"
                    ? "bg-gradient-hero text-white shadow-card"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Professionnels
              </button>
            </div>
          </div>
        </section>

        {/* Plans */}
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
                  <PricingCard
                    name="Pro Events"
                    price="149€"
                    period="mois"
                    description="Pour photographes, wedding planners et agences événementielles"
                    badge="Recommandé"
                    highlighted
                    features={[
                      "Événements illimités",
                      "Photos illimitées",
                      "Espace brandé à votre nom et logo",
                      "Gestion multi-clients et multi-événements",
                      "Galeries privées par client",
                      "Export haute qualité",
                      "Analytics de base (nombre de scans, uploads)",
                      "Support dédié par email",
                    ]}
                    ctaLabel="Nous contacter pour démarrer"
                    ctaTo="/contact"
                  />
                </div>
                <div className="relative p-8 rounded-2xl border border-dashed border-border bg-muted/40 shadow-soft flex flex-col text-center">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-secondary text-secondary-foreground px-4 py-1 rounded-full text-sm font-semibold shadow-soft">
                    Bientôt
                  </div>
                  <div className="mb-6 mt-2">
                    <h3 className="text-2xl font-bold mb-2">Agence & Revendeur</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Tarif sur devis
                    </p>
                  </div>
                  <ul className="space-y-3 mb-8 text-sm text-left">
                    <li>• Accès multi-utilisateurs</li>
                    <li>• Intégration à vos outils</li>
                    <li>• Facturation en marque blanche</li>
                    <li>• Compte manager dédié</li>
                  </ul>
                  <Button asChild variant="outline" size="lg" className="w-full mt-auto">
                    <Link to="/contact">Rejoindre la liste d'attente</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Add-ons */}
        <section className="px-4 py-20 bg-muted/30">
          <div className="container mx-auto max-w-6xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Personnalisez votre expérience
            </h2>
            <p className="text-muted-foreground text-lg mb-12">
              Des options sans engagement pour aller plus loin.
            </p>
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

        {/* FAQ */}
        <section className="px-4 py-20">
          <div className="container mx-auto max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">
              Questions fréquentes
            </h2>
            <div className="space-y-6">
              {faqs.map((f) => (
                <div
                  key={f.q}
                  className="p-6 rounded-2xl bg-card border border-border shadow-soft"
                >
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
