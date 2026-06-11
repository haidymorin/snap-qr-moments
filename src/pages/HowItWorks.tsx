import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { QrCode, Users, Upload, Download, Play, Heart } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const HowItWorks = () => {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen">
      <Header />

      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          {/* Hero */}
          <div className="text-center mb-20 animate-fade-in">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              {t("how.title1")}{" "}
              <span className="bg-gradient-hero bg-clip-text text-transparent">{t("how.title2")}</span>{" "}
              {t("how.title3")}
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">{t("how.subtitle")}</p>
          </div>

          {/* Steps */}
          <div className="max-w-4xl mx-auto space-y-20">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1 space-y-4">
                <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-card">
                  1
                </div>
                <h2 className="text-3xl font-bold">{t("how.step1Title")}</h2>
                <p className="text-lg text-muted-foreground">{t("how.step1Desc")}</p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-primary" />
                    <span>{t("how.step1B1")}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <span>{t("how.step1B2")}</span>
                  </li>
                </ul>
              </div>
              <div className="flex-1">
                <div className="bg-gradient-card rounded-2xl p-8 shadow-card border border-border">
                  <QrCode className="w-full h-48 text-primary" />
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row-reverse gap-8 items-center">
              <div className="flex-1 space-y-4">
                <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-card">
                  2
                </div>
                <h2 className="text-3xl font-bold">{t("how.step2Title")}</h2>
                <p className="text-lg text-muted-foreground">{t("how.step2Desc")}</p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Upload className="w-5 h-5 text-primary" />
                    <span>{t("how.step2B1")}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <span>{t("how.step2B2")}</span>
                  </li>
                </ul>
              </div>
              <div className="flex-1">
                <div className="bg-gradient-card rounded-2xl p-8 shadow-card border border-border">
                  <Upload className="w-full h-48 text-primary" />
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1 space-y-4">
                <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-card">
                  3
                </div>
                <h2 className="text-3xl font-bold">{t("how.step3Title")}</h2>
                <p className="text-lg text-muted-foreground">{t("how.step3Desc")}</p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Download className="w-5 h-5 text-primary" />
                    <span>{t("how.step3B1")}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Play className="w-5 h-5 text-primary" />
                    <span>{t("how.step3B2")}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-primary" />
                    <span>{t("how.step3B3")}</span>
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
              <h2 className="text-3xl font-bold text-white mb-4">{t("how.ctaTitle")}</h2>
              <Button asChild variant="secondary" size="lg">
                <Link to="/contact">{t("how.ctaButton")}</Link>
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
