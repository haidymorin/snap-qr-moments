import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const Footer = () => {
  const { t } = useLanguage();
  return (
    <footer className="bg-card border-t border-border mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h3 className="text-xl font-bold font-display text-foreground">
              QR Memories
            </h3>
            <p className="text-sm text-muted-foreground">{t("footer.tagline")}</p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t("footer.navigation")}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {t("nav.home")}
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {t("nav.how")}
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {t("nav.pricing")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t("footer.support")}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {t("nav.contact")}
                </Link>
              </li>
              <li>
                <Link to="/pricing#faq" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {t("footer.faq")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t("footer.legal")}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/legal" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {t("footer.legalNotice")}
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {t("footer.privacy")}
                </Link>
              </li>
              <li>
                <Link to="/cgv" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {t("footer.terms")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border text-center">
          {/* Une marque qui se félicite elle-même sonne creux, et le cœur rouge
              jurait avec la charte. Le nom et la ville suffisent : c'est ce
              qu'attend un prescripteur qui vérifie à qui il a affaire. */}
          <p className="label-mono text-muted-foreground">QR Memories · Paris</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
