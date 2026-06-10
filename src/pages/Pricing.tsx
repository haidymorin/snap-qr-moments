import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PricingCard from "@/components/PricingCard";

const Pricing = () => {
  return (
    <div className="min-h-screen">
      <Header />

      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          {/* Hero */}
          <div className="text-center mb-16 animate-fade-in">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Des tarifs <span className="bg-gradient-hero bg-clip-text text-transparent">transparents</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Choisissez la formule qui correspond à vos besoins. Pas de frais cachés, pas de surprise.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-20">
            <PricingCard
              name="Free Test"
              price="Gratuit"
              description="Parfait pour tester le service"
              features={[
                "1 événement",
                "Jusqu'à 15 photos",
                "QR Code personnalisable",
                "Album partagé",
                "Téléchargement des photos",
                "Support par email",
              ]}
            />

            <PricingCard
              name="Premium Event"
              price="39€"
              period="événement"
              description="Pour un événement mémorable"
              features={[
                "1 événement illimité",
                "Photos illimitées",
                "QR Code personnalisé premium",
                "Albums personnalisés",
                "Diaporama automatique (bientôt disponible)",
                "Création de clips vidéo (bientôt disponible)",
                "Filtres par invité (bientôt disponible)",
                "Support prioritaire 24/7",
              ]}
              highlighted={true}
              badge="Populaire"
            />

            <PricingCard
              name="Pro Events"
              price="149€"
              period="mois"
              description="Pour les professionnels"
              features={[
                "Événements illimités",
                "Tout illimité",
                "Marque personnalisable",
                "Analytics avancés",
                "API access",
                "Albums privés multiples",
                "Export haute qualité",
                "Support dédié premium",
                "Formation personnalisée",
              ]}
              badge="Recommandé"
            />
          </div>

          {/* Options à la carte */}
          <div className="max-w-6xl mx-auto mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Options <span className="bg-gradient-hero bg-clip-text text-transparent">à la carte</span>
              </h2>
              <p className="text-muted-foreground">
                Complétez votre formule avec des services additionnels.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  title: "Support physique QR Code",
                  desc: "Carton de table, chevalet ou affiche d'entrée. Fichiers PDF fournis.",
                  price: "à partir de 9€",
                },
                {
                  title: "Album photo digital PDF",
                  desc: "Un album numérique au format PDF, prêt à partager.",
                  price: "14€",
                },
                {
                  title: "Album photo imprimé",
                  desc: "Album imprimé de qualité, livré à domicile.",
                  price: "à partir de 29€",
                },
                {
                  title: "Stockage longue durée",
                  desc: "Conservez vos photos pendant 2 ans en toute sécurité.",
                  price: "4€/mois",
                },
              ].map((opt) => (
                <div
                  key={opt.title}
                  className="p-6 bg-card rounded-2xl border border-border shadow-soft hover:shadow-card transition-all"
                >
                  <h3 className="font-semibold text-lg mb-2">{opt.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{opt.desc}</p>
                  <p className="font-bold text-primary">{opt.price}</p>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Questions fréquentes</h2>
            <div className="space-y-6">
              <div className="p-6 bg-card rounded-xl border border-border shadow-soft">
                <h3 className="font-semibold text-lg mb-2">Puis-je changer de formule ?</h3>
                <p className="text-muted-foreground">
                  Oui, vous pouvez upgrader ou downgrader votre formule à tout moment. Les changements sont immédiats.
                </p>
              </div>

              <div className="p-6 bg-card rounded-xl border border-border shadow-soft">
                <h3 className="font-semibold text-lg mb-2">Y a-t-il des frais supplémentaires ?</h3>
                <p className="text-muted-foreground">
                  Non, tous les tarifs affichés sont tout compris. Aucun frais caché ou surprise.
                </p>
              </div>

              <div className="p-6 bg-card rounded-xl border border-border shadow-soft">
                <h3 className="font-semibold text-lg mb-2">Combien de temps les photos sont conservées ?</h3>
                <p className="text-muted-foreground">
                  Vos photos sont conservées 60 jours après l'événement. Option stockage longue durée disponible.
                </p>
              </div>

              <div className="p-6 bg-card rounded-xl border border-border shadow-soft">
                <h3 className="font-semibold text-lg mb-2">Le paiement est-il sécurisé ?</h3>
                <p className="text-muted-foreground">
                  Oui, nous utilisons les dernières technologies de cryptage pour garantir la sécurité de vos paiements.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;
