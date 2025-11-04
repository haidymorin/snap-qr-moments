import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { QrCode, Users, Upload, Download, Play, Heart } from "lucide-react";

const HowItWorks = () => {
  return (
    <div className="min-h-screen">
      <Header />

      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          {/* Hero */}
          <div className="text-center mb-20 animate-fade-in">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Comment ça <span className="bg-gradient-hero bg-clip-text text-transparent">fonctionne</span> ?
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              QR Memories simplifie le partage de photos lors de vos événements. Découvrez comment en 3 étapes simples.
            </p>
          </div>

          {/* Steps */}
          <div className="max-w-4xl mx-auto space-y-20">
            {/* Step 1 */}
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1 space-y-4">
                <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-card">
                  1
                </div>
                <h2 className="text-3xl font-bold">Créez votre événement</h2>
                <p className="text-lg text-muted-foreground">
                  Inscrivez-vous en quelques secondes et créez votre événement. Indiquez le nom, la date, et personnalisez votre QR Code.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-primary" />
                    <span>Obtenez votre QR Code unique</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <span>Invitez autant de personnes que vous voulez</span>
                  </li>
                </ul>
              </div>
              <div className="flex-1">
                <div className="bg-gradient-card rounded-2xl p-8 shadow-card border border-border">
                  <QrCode className="w-full h-48 text-primary" />
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col md:flex-row-reverse gap-8 items-center">
              <div className="flex-1 space-y-4">
                <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-card">
                  2
                </div>
                <h2 className="text-3xl font-bold">Vos invités participent</h2>
                <p className="text-lg text-muted-foreground">
                  Partagez le QR Code (affiché à l'événement, envoyé par mail, etc.). Vos invités le scannent et partagent leurs photos instantanément.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Upload className="w-5 h-5 text-primary" />
                    <span>Aucune application à télécharger</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <span>Fonctionne sur tous les smartphones</span>
                  </li>
                </ul>
              </div>
              <div className="flex-1">
                <div className="bg-gradient-card rounded-2xl p-8 shadow-card border border-border">
                  <Upload className="w-full h-48 text-primary" />
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1 space-y-4">
                <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-card">
                  3
                </div>
                <h2 className="text-3xl font-bold">Profitez de vos souvenirs</h2>
                <p className="text-lg text-muted-foreground">
                  Accédez à toutes les photos dans votre espace personnel. Téléchargez-les, créez des albums personnalisés ou générez un diaporama automatique.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Download className="w-5 h-5 text-primary" />
                    <span>Téléchargement en masse</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Play className="w-5 h-5 text-primary" />
                    <span>Création de clips vidéo automatiques</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-primary" />
                    <span>Sélection de vos favoris</span>
                  </li>
                </ul>
              </div>
              <div className="flex-1">
                <div className="bg-gradient-card rounded-2xl p-8 shadow-card border border-border">
                  <Download className="w-full h-48 text-primary" />
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-20">
            <div className="inline-block p-12 bg-gradient-hero rounded-3xl shadow-card">
              <h2 className="text-3xl font-bold text-white mb-4">
                Convaincu ? Créez votre premier événement !
              </h2>
              <Button asChild variant="secondary" size="lg">
                <Link to="/contact">Commencer gratuitement</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default HowItWorks;
