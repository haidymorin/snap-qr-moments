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
import { useLanguage } from "@/contexts/LanguageContext";

const Index = () => {
  const { t } = useLanguage();
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
                {t("home.heroTitle1")}
              </span>
              <br />
              {t("home.heroTitle2")}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              {t("home.heroSubtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild variant="hero" size="lg" className="text-lg">
                <Link to="/auth">{t("home.ctaCreate")}</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg">
                <Link to="/how-it-works">{t("home.ctaDiscover")}</Link>
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
              {t("home.simpleTitle")}{" "}
              <span className="bg-gradient-hero bg-clip-text text-transparent">{t("home.simpleNumbers")}</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t("home.simpleSubtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <FeatureCard
              step={1}
              icon={<img src={qrIcon} alt="QR Code" className="w-20 h-20 rounded-xl" />}
              title={t("home.step1Title")}
              description={t("home.step1Desc")}
            />
            <FeatureCard
              step={2}
              icon={<img src={photosIcon} alt="" className="w-20 h-20 rounded-xl" />}
              title={t("home.step2Title")}
              description={t("home.step2Desc")}
            />
            <FeatureCard
              step={3}
              icon={<img src={albumIcon} alt="" className="w-20 h-20 rounded-xl" />}
              title={t("home.step3Title")}
              description={t("home.step3Desc")}
            />
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gradient-card">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-12">
            <h2 className="text-4xl md:text-5xl font-bold">
              {t("home.whyTitle")}{" "}
              <span className="bg-gradient-hero bg-clip-text text-transparent">QR Memories</span> ?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center mx-auto">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold">{t("home.benefit1Title")}</h3>
                <p className="text-muted-foreground">{t("home.benefit1Desc")}</p>
              </div>

              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center mx-auto">
                  <Camera className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold">{t("home.benefit2Title")}</h3>
                <p className="text-muted-foreground">{t("home.benefit2Desc")}</p>
              </div>

              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center mx-auto">
                  <Share2 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold">{t("home.benefit3Title")}</h3>
                <p className="text-muted-foreground">{t("home.benefit3Desc")}</p>
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
                  {t("home.proTitle")}{" "}
                  <span className="bg-gradient-hero bg-clip-text text-transparent">
                    {t("home.proHighlight")}
                  </span>{" "}
                  {t("home.proQuestion")}
                </h2>
                <p className="text-lg text-muted-foreground">{t("home.proDesc")}</p>
                <Button asChild variant="hero" size="lg">
                  <Link to="/pricing">{t("home.proCta")}</Link>
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-1 gap-4">
                <div className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border">
                  <div className="w-12 h-12 bg-gradient-hero rounded-xl flex items-center justify-center shrink-0">
                    <Layers className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{t("home.proF1Title")}</h3>
                    <p className="text-sm text-muted-foreground">{t("home.proF1Desc")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border">
                  <div className="w-12 h-12 bg-gradient-hero rounded-xl flex items-center justify-center shrink-0">
                    <Palette className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{t("home.proF2Title")}</h3>
                    <p className="text-sm text-muted-foreground">{t("home.proF2Desc")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border">
                  <div className="w-12 h-12 bg-gradient-hero rounded-xl flex items-center justify-center shrink-0">
                    <ImageIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{t("home.proF3Title")}</h3>
                    <p className="text-sm text-muted-foreground">{t("home.proF3Desc")}</p>
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
              {t("home.finalCtaTitle")}
            </h2>
            <p className="text-xl text-white/90">{t("home.finalCtaDesc")}</p>
            <Button asChild variant="secondary" size="lg" className="text-lg">
              <Link to="/auth">{t("home.finalCta")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
