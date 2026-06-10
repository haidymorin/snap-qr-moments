import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PricingCard from "@/components/PricingCard";

const aLaCarte = [
  {
    title: "Supports physiques QR Code",
    price: "à partir de 9€",
    desc: "Carton de table, chevalet ou affiche d'entrée. Fichiers PDF haute résolution prêts à imprimer, personnalisés avec votre événement.",
  },
  {
    title: "Album digital PDF",
    price: "14€",
    desc: "Sélectionnez vos meilleures photos et recevez un beau PDF élégant, prêt à partager ou à imprimer.",
  },
  {
    title: "Album photo imprimé",
    price: "à partir de 29€",
    desc: "Un vrai album photo livré chez vous. En partenariat avec des imprimeurs professionnels.",
  },
  {
    title: "Stockage longue durée",
    price: "4€/mois",
    desc: "Vos photos conservées 2 ans au lieu de 60 jours.",
  },
];

const faq = [
  {
    q: "Combien de temps mes photos sont-elles conservées ?",
    a: "60 jours après l'événement pour les offres Free et Premium. 60 jours également pour le Pro, extensible avec l'option stockage longue durée.",
  },
  {
    q: "Puis-je changer de formule ?",
    a: "Oui, à tout moment. L'upgrade est immédiat.",
  },
  {
    q: "Y a-t-il des frais cachés ?",
    a: "Non. Le prix affiché est le prix final.",
  },
  {
    q: "Le paiement est-il sécurisé ?",
    a: "Oui, via les standards de chiffrement actuels.",
  },
];

const Pricing = () => {
  return (
    <div className="min-h-screen">
      <Header />

      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          {/* Hero */}
          <div className="text-center mb-16 animate-fade-in">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Des tarifs <span className="bg-gradient-hero bg-clip-text text-transparent">simples et transparents</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Commencez gratuitement. Upgradez quand vous en avez besoin.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-24">
            <PricingCard
              name="Free Test"
              price="Gratuit"
              description="Pour découvrir le service"
              features={[
                "1 événement",
                "15 photos maximum",
                "QR Code unique",
                "Galerie partagée",
                "Téléchargement ZIP",
                "Support par email",
              ]}
              ctaLabel="Commencer gratuitement"
              ctaTo="/auth"
            />

            <PricingCard
              name="Premium Event"
              price="39€"
              period="événement"
              description="Pour un événement mémorable"
              features={[
                "1 événement",
                "Photos illimitées",
                "QR Code premium personnalisé",
                "Galerie haute qualité",
                "Téléchargement ZIP organisateur",
                "Albums personnalisés par invité (bientôt disponible)",
                "Tri intelligent par IA (bientôt disponible)",
                "Support prioritaire",
              ]}
              highlighted={true}
              badge="Populaire"
              ctaLabel="Créer mon événement"
              ctaTo="/auth"
            />

            <PricingCard
              name="Pro Events"
              price="149€"
              period="mois"
              description="Pour les photographes et professionnels de l'événementiel"
              features={[
                "Événements illimités",
                "Photos illimitées",
                "Branding personnalisé à votre nom",
                "Gestion multi-événements",
                "Galeries privées par client",
                "Export haute qualité",
                "Analytics de base",
                "Support dédié",
              ]}
              badge="Recommandé"
              ctaLabel="Nous contacter"
              ctaTo="/contact"
            />
          </div>

          {/* Options à la carte */}
          <div className="max-w-6xl mx-auto mb-24">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Personnalisez votre <span className="bg-gradient-hero bg-clip-text text-transparent">expérience</span>
              </h2>
              <p className="text-muted-foreground">
                Ajoutez ce dont vous avez besoin, sans vous engager.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {aLaCarte.map((opt) => (
                <div
                  key={opt.title}
                  className="p-6 bg-card rounded-2xl border border-border shadow-soft hover:shadow-card hover:-translate-y-1 transition-all"
                >
                  <h3 className="font-semibold text-lg mb-2">{opt.title}</h3>
                  <p className="font-bold text-primary mb-3">{opt.price}</p>
                  <p className="text-sm text-muted-foreground">{opt.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Questions fréquentes</h2>
            <div className="space-y-6">
              {faq.map((item) => (
                <div key={item.q} className="p-6 bg-card rounded-xl border border-border shadow-soft">
                  <h3 className="font-semibold text-lg mb-2">{item.q}</h3>
                  <p className="text-muted-foreground">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;
