import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FeatureCard from "@/components/FeatureCard";
import heroImage from "@/assets/hero-image.jpg";
import qrIcon from "@/assets/qr-icon.jpg";
import photosIcon from "@/assets/photos-icon.jpg";
import albumIcon from "@/assets/album-icon.jpg";
import { Sparkles, Camera, Share2, Layers, Palette, Image as ImageIcon } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/85 to-background"></div>
        </div>

        <div className="container mx-auto px-4 z-10 text-center animate-fade-in">
          <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-5xl md:text-7xl font-bold leading-tight">
              <span className="bg-gradient-hero bg-clip-text text-transparent">
                Scannez. Partagez.
              </span>
              <br />
              Revivez vos souvenirs.
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Collectez et partagez les photos de vos événements via un simple QR Code.
              Pas d'application, juste de la magie.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild variant="hero" size="lg" className="text-lg">
                <Link to="/auth">Créer mon album événement</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg">
                <Link to="/how-it-works">Découvrir comment ça marche</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Simple comme <span className="bg-gradient-hero bg-clip-text text-transparent">1, 2, 3</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              En quelques secondes, créez votre album partagé et récupérez tous les souvenirs de vos invités.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <FeatureCard
              step={1}
              icon={<img src={qrIcon} alt="QR Code" className="w-20 h-20 rounded-xl" />}
              title="Créez votre événement"
              description="En quelques clics, configurez votre album événement et obtenez un QR Code unique à partager."
            />
            <FeatureCard
              step={2}
              icon={<img src={photosIcon} alt="Partage photos" className="w-20 h-20 rounded-xl" />}
              title="Vos invités scannent"
              description="Ils scannent le QR Code et partagent leurs photos instantanément, sans télécharger d'application."
            />
            <FeatureCard
              step={3}
              icon={<img src={albumIcon} alt="Album" className="w-20 h-20 rounded-xl" />}
              title="Profitez de vos souvenirs"
              description="Toutes les photos apparaissent dans votre album partagé. Téléchargez-les ou créez un diaporama."
            />
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gradient-card">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-12">
            <h2 className="text-4xl md:text-5xl font-bold">
              Pourquoi choisir <span className="bg-gradient-hero bg-clip-text text-transparent">QR Memories</span> ?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center mx-auto">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold">Ultra simple</h3>
                <p className="text-muted-foreground">
                  Pas d'application à télécharger. Un simple scan suffit.
                </p>
              </div>

              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center mx-auto">
                  <Camera className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold">Photos illimitées</h3>
                <p className="text-muted-foreground">
                  Collectez autant de photos que vous le souhaitez.
                </p>
              </div>

              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center mx-auto">
                  <Share2 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold">Partage instantané</h3>
                <p className="text-muted-foreground">
                  Accédez à tous vos souvenirs en temps réel.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pro Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto bg-gradient-card rounded-3xl shadow-card p-10 md:p-14">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <div className="space-y-6">
                <h2 className="text-3xl md:text-4xl font-bold">
                  Vous êtes <span className="bg-gradient-hero bg-clip-text text-transparent">photographe ou wedding planner</span> ?
                </h2>
                <p className="text-lg text-muted-foreground">
                  QR Memories s'intègre directement à votre offre. Proposez à vos clients un espace de collecte photos
                  brandé à votre nom, sans effort supplémentaire. Simplifiez votre livraison de galeries et devenez
                  prescripteur.
                </p>
                <Button asChild variant="hero" size="lg">
                  <Link to="/pricing">Découvrir l'offre Pro</Link>
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-1 gap-4">
                <div className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border">
                  <div className="w-12 h-12 bg-gradient-hero rounded-xl flex items-center justify-center shrink-0">
                    <Layers className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Multi-événements</h3>
                    <p className="text-sm text-muted-foreground">Gérez tous vos clients en un seul espace.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border">
                  <div className="w-12 h-12 bg-gradient-hero rounded-xl flex items-center justify-center shrink-0">
                    <Palette className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Branding personnalisé</h3>
                    <p className="text-sm text-muted-foreground">Vos couleurs, votre logo, votre identité.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border">
                  <div className="w-12 h-12 bg-gradient-hero rounded-xl flex items-center justify-center shrink-0">
                    <ImageIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Galerie pro</h3>
                    <p className="text-sm text-muted-foreground">Livraison soignée et expérience client premium.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-8 p-12 bg-gradient-hero rounded-3xl shadow-card">
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              Prêt à immortaliser votre événement ?
            </h2>
            <p className="text-xl text-white/90">
              Rejoignez des milliers d'organisateurs qui ont déjà choisi QR Memories pour leurs événements.
            </p>
            <Button asChild variant="secondary" size="lg" className="text-lg">
              <Link to="/auth">Créer mon événement gratuitement</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
